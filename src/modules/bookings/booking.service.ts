import { addDays, startOfDay, isBefore } from 'date-fns';
import prisma from '../../prisma.js';
import { Booking as BookingModel } from '@prisma/client';
import { BookingInput } from './booking.contract.js';

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

export async function isBookingPossible(booking: BookingInput): Promise<BookingOutcome> {
    const checkInDate = startOfDay(new Date(booking.checkInDate));
    const checkOutDate = getCheckOutDate(checkInDate, booking.numberOfNights);
    const overlapFilter = getOverlapFilter(checkInDate, checkOutDate);

    // check 1 : The same guest cannot book the same unit for overlapping dates
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

    // check 2 : the same guest cannot be in multiple units at the same time (overlapping dates)
    const sameGuestAlreadyBooked = await prisma.booking.findFirst({
        where: {
            guestName: booking.guestName,
            ...overlapFilter,
        },
    });
    if (sameGuestAlreadyBooked) {
        return { result: false, reason: "The same guest cannot be in multiple units at the same time" };
    }

    // check 3 : Unit is available for the requested dates (allowing same-day check-out and check-in)
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

export async function createBookingRecord(bookingPayload: BookingInput): Promise<BookingModel> {
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

export async function isExtensionPossible(
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

    // Check 1: Same guest in another unit during extension period
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

    // Check 2: Unit occupied by another guest during extension period
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

export async function extendBookingRecord(
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
