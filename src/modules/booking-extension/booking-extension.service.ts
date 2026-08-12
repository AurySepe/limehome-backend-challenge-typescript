import { Injectable } from '@nestjs/common';
import { isBefore, startOfDay } from 'date-fns';
import { PrismaTransactionClient } from '../../prisma';
import { Booking as BookingModel } from '@prisma/client';
import { getCheckOutDate, getOverlapFilter, BookingOutcome } from '../bookings/booking.service';

@Injectable()
export class BookingExtensionService {
    async isExtensionPossible(
        existingBooking: BookingModel,
        extraNights: number,
        tx: PrismaTransactionClient
    ): Promise<BookingOutcome & { newCheckOutDate?: Date; previousCheckOutDate?: Date }> {
        const today = startOfDay(new Date());
        if (isBefore(new Date(existingBooking.checkOutDate), today)) {
            return { result: false, reason: "Cannot extend a booking that has already ended" };
        }

        const previousCheckOutDate = existingBooking.checkOutDate;
        const newCheckOutDate = getCheckOutDate(previousCheckOutDate, extraNights);
        const extensionOverlapFilter = getOverlapFilter(previousCheckOutDate, newCheckOutDate);

        const guestConflict = await tx.booking.findFirst({
            where: {
                guestName: existingBooking.guestName,
                id: { not: existingBooking.id },
                ...extensionOverlapFilter,
            }
        });
        if (guestConflict) {
            return { result: false, reason: "The same guest cannot be in multiple units at the same time" };
        }

        const unitConflict = await tx.booking.findFirst({
            where: {
                unitID: existingBooking.unitID,
                id: { not: existingBooking.id },
                ...extensionOverlapFilter,
            }
        });
        if (unitConflict) {
            return { result: false, reason: "For the requested extension dates, the unit is already occupied" };
        }

        return {
            result: true,
            reason: "OK",
            previousCheckOutDate,
            newCheckOutDate,
        };
    }

    async extendBookingRecord(
        existingBooking: BookingModel,
        extraNights: number,
        previousCheckOutDate: Date,
        newCheckOutDate: Date,
        tx: PrismaTransactionClient
    ): Promise<BookingModel | null> {
        await tx.bookingExtension.create({
            data: {
                bookingId: existingBooking.id,
                extraNights,
                previousCheckOutDate,
                newCheckOutDate,
            }
        });

        // Optimistic locking: only update if checkOutDate hasn't changed since we read it.
        // If a concurrent extension already committed, the WHERE won't match and count = 0.
        const result = await tx.booking.updateMany({
            where: { id: existingBooking.id, checkOutDate: previousCheckOutDate },
            data: {
                numberOfNights: existingBooking.numberOfNights + extraNights,
                checkOutDate: newCheckOutDate,
            }
        });

        if (result.count === 0) {
            // Signal the controller to rollback and return a conflict response
            return null;
        }

        return tx.booking.findUniqueOrThrow({ where: { id: existingBooking.id } });
    }
}
