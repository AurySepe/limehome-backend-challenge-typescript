import { Request, Response, NextFunction } from 'express';
import { startOfDay } from 'date-fns';
import prisma from '../prisma.js';
import {
    BookingPayload,
    getCheckOutDate,
    isBookingPossible,
    isExtensionPossible
} from '../services/bookings.js';

const healthCheck = async (req: Request, res: Response, next: NextFunction) => {
    return res.status(200).json({
        message: "OK"
    });
};

const createBooking = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const booking: BookingPayload = req.body;

        const outcome = await isBookingPossible(booking);
        if (!outcome.result) {
            return res.status(400).json(outcome.reason);
        }

        const checkInDate = startOfDay(new Date(booking.checkInDate));
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
};

interface ExtendBookingRequest {
    extraNights: number;
}

const extendBooking = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const bookingId = parseInt(req.params.id, 10);
        const { extraNights }: ExtendBookingRequest = req.body;


        const existingBooking = await prisma.booking.findUnique({
            where: { id: bookingId }
        });

        if (!existingBooking) {
            return res.status(404).json("Booking not found");
        }

        const extensionCheck = await isExtensionPossible(existingBooking, extraNights);
        if (!extensionCheck.result || !extensionCheck.previousCheckOutDate || !extensionCheck.newCheckOutDate) {
            return res.status(400).json(extensionCheck.reason);
        }

        const [extension, updatedBooking] = await prisma.$transaction([
            prisma.bookingExtension.create({
                data: {
                    bookingId,
                    extraNights,
                    previousCheckOutDate: extensionCheck.previousCheckOutDate,
                    newCheckOutDate: extensionCheck.newCheckOutDate,
                }
            }),
            prisma.booking.update({
                where: { id: bookingId },
                data: {
                    numberOfNights: existingBooking.numberOfNights + extraNights,
                    checkOutDate: extensionCheck.newCheckOutDate,
                }
            })
        ]);

        return res.status(200).json({
            id: updatedBooking.id,
            guestName: updatedBooking.guestName,
            unitID: updatedBooking.unitID,
            checkInDate: updatedBooking.checkInDate,
            numberOfNights: updatedBooking.numberOfNights,
            checkOutDate: updatedBooking.checkOutDate,
        });
    } catch (error) {
        console.error("extendBooking error:", error);
        return res.status(500).json({ error: String(error) });
    }
};

export default { healthCheck, createBooking, extendBooking };
