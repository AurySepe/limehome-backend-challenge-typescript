import { Injectable } from '@nestjs/common';
import { isBefore, startOfDay } from 'date-fns';
import prisma from '../../prisma';
import { Booking as BookingModel } from '@prisma/client';
import { getCheckOutDate, getOverlapFilter, BookingOutcome } from '../bookings/booking.service';

@Injectable()
export class BookingExtensionService {
    async isExtensionPossible(
        existingBooking: BookingModel,
        extraNights: number
    ): Promise<BookingOutcome & { newCheckOutDate?: Date; previousCheckOutDate?: Date }> {
        const today = startOfDay(new Date());
        if (isBefore(new Date(existingBooking.checkOutDate), today)) {
            return { result: false, reason: "Cannot extend a booking that has already ended" };
        }

        const previousCheckOutDate = existingBooking.checkOutDate;
        const newCheckOutDate = getCheckOutDate(previousCheckOutDate, extraNights);
        const extensionOverlapFilter = getOverlapFilter(previousCheckOutDate, newCheckOutDate);

        const guestConflict = await prisma.booking.findFirst({
            where: {
                guestName: existingBooking.guestName,
                id: { not: existingBooking.id },
                ...extensionOverlapFilter,
            }
        });
        if (guestConflict) {
            return { result: false, reason: "The same guest cannot be in multiple units at the same time" };
        }

        const unitConflict = await prisma.booking.findFirst({
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
        newCheckOutDate: Date
    ): Promise<BookingModel> {
        const [extension, updatedBooking] = await prisma.$transaction([
            prisma.bookingExtension.create({
                data: {
                    bookingId: existingBooking.id,
                    extraNights,
                    previousCheckOutDate,
                    newCheckOutDate,
                }
            }),
            prisma.booking.update({
                where: { id: existingBooking.id },
                data: {
                    numberOfNights: existingBooking.numberOfNights + extraNights,
                    checkOutDate: newCheckOutDate,
                }
            })
        ]);

        return updatedBooking;
    }
}
