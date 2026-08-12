import { addDays, startOfDay, isBefore } from 'date-fns';
import prisma from '../prisma.js';
import { Booking as BookingModel } from '@prisma/client';

export interface BookingPayload {
    guestName: string;
    unitID: string;
    checkInDate: Date;
    numberOfNights: number;
}

export type BookingOutcome = { result: boolean; reason: string };

export function getCheckOutDate(checkInDate: Date, numberOfNights: number): Date {
    return addDays(new Date(checkInDate), numberOfNights);
}

// Helper: checks for date range overlaps.
// Check-out date is excluded because a new guest can check in on the same day an existing guest checks out.
export function getOverlapFilter(checkInDate: Date, checkOutDate: Date) {
    return {
        checkInDate: { lt: checkOutDate },
        checkOutDate: { gt: checkInDate },
    };
}

export async function isBookingPossible(booking: BookingPayload): Promise<BookingOutcome> {
    // Defensively normalize checkInDate to midnight using date-fns startOfDay
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

export async function isExtensionPossible(
    existingBooking: BookingModel,
    extraNights: number
): Promise<BookingOutcome & { newCheckOutDate?: Date; previousCheckOutDate?: Date }> {
    // Normalize current date to midnight using date-fns startOfDay for date-only comparison.
    // This allows guests to extend their stay during their check-out day before the date passes.
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

