import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma.js';

interface Booking {
    guestName: string;
    unitID: string;
    checkInDate: Date;
    numberOfNights: number;
}

const healthCheck = async (req: Request, res: Response, next: NextFunction) => {
    return res.status(200).json({
        message: "OK"
    })
}

function getCheckOutDate(checkInDate: Date, numberOfNights: number): Date {
    const checkOut = new Date(checkInDate);
    checkOut.setDate(checkOut.getDate() + numberOfNights);
    return checkOut;
}

const createBooking = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const booking: Booking = req.body;

        const outcome = await isBookingPossible(booking);
        if (!outcome.result) {
            return res.status(400).json(outcome.reason);
        }

        const checkInDate = new Date(booking.checkInDate);
        const checkOutDate = getCheckOutDate(checkInDate, booking.numberOfNights);

        const bookingResult = await prisma.booking.create({
            data: {
                guestName: booking.guestName,
                unitID: booking.unitID,
                checkInDate,
                numberOfNights: booking.numberOfNights,
                checkOutDate,
            }
        });

        return res.status(200).json(bookingResult);
    } catch (error) {
        console.error("createBooking error:", error);
        return res.status(500).json({ error: String(error) });
    }
}

type bookingOutcome = { result: boolean; reason: string };

// Helper: checks for date range overlaps.
// Check-out date is excluded because a new guest can check in on the same day an existing guest checks out.
function getOverlapFilter(checkInDate: Date, checkOutDate: Date) {
    return {
        checkInDate: { lt: checkOutDate },
        checkOutDate: { gt: checkInDate },
    };
}

async function isBookingPossible(booking: Booking): Promise<bookingOutcome> {
    const checkInDate = new Date(booking.checkInDate);
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

export default { healthCheck, createBooking }
