import { Injectable } from '@nestjs/common';
import { addDays, startOfDay } from 'date-fns';
import prisma from '../../prisma';
import { Booking as BookingModel } from '@prisma/client';
import { CreateBookingDto } from './booking.dto';

export type BookingOutcome = { result: boolean; reason: string };

export function getCheckOutDate(checkInDate: Date, numberOfNights: number): Date {
    return addDays(new Date(checkInDate), numberOfNights);
}

export function getOverlapFilter(checkInDate: Date, checkOutDate: Date) {
    return {
        checkInDate: { lt: checkOutDate },
        checkOutDate: { gt: checkInDate },
    };
}

@Injectable()
export class BookingService {
    async isBookingPossible(booking: CreateBookingDto): Promise<BookingOutcome> {
        const checkInDate = startOfDay(new Date(booking.checkInDate));
        const checkOutDate = getCheckOutDate(checkInDate, booking.numberOfNights);
        const overlapFilter = getOverlapFilter(checkInDate, checkOutDate);

        const sameGuestSameUnit = await prisma.booking.findFirst({
            where: {
                guestName: booking.guestName,
                unitID: booking.unitID,
                ...overlapFilter,
            },
        });
        if (sameGuestSameUnit) {
            return { result: false, reason: "The given guest name cannot book the same unit multiple times" };
        }

        const sameGuestAlreadyBooked = await prisma.booking.findFirst({
            where: {
                guestName: booking.guestName,
                ...overlapFilter,
            },
        });
        if (sameGuestAlreadyBooked) {
            return { result: false, reason: "The same guest cannot be in multiple units at the same time" };
        }

        const unitOccupiedOnDate = await prisma.booking.findFirst({
            where: {
                unitID: booking.unitID,
                ...overlapFilter,
            },
        });
        if (unitOccupiedOnDate) {
            return { result: false, reason: "For the given check-in date, the unit is already occupied" };
        }

        return { result: true, reason: "OK" };
    }

    async createBookingRecord(bookingPayload: CreateBookingDto): Promise<BookingModel> {
        const checkInDate = startOfDay(new Date(bookingPayload.checkInDate));
        const checkOutDate = getCheckOutDate(checkInDate, bookingPayload.numberOfNights);

        return prisma.booking.create({
            data: {
                guestName: bookingPayload.guestName,
                unitID: bookingPayload.unitID,
                checkInDate,
                numberOfNights: bookingPayload.numberOfNights,
                checkOutDate,
            }
        });
    }
}
