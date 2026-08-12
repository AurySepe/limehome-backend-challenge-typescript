import { initServer } from '@ts-rest/express';
import prisma from '../../prisma.js';
import { bookingContract } from './booking.contract.js';
import {
    isBookingPossible,
    createBookingRecord,
    isExtensionPossible,
    extendBookingRecord
} from './booking.service.js';

const s = initServer();

export const bookingController = s.router(bookingContract, {
    healthCheck: async () => {
        return {
            status: 200,
            body: {
                message: "OK"
            }
        };
    },

    createBooking: async ({ body }) => {
        const outcome = await isBookingPossible(body);
        if (!outcome.result) {
            return {
                status: 400,
                body: outcome.reason
            };
        }

        const booking = await createBookingRecord(body);

        return {
            status: 200,
            body: {
                id: booking.id,
                guestName: booking.guestName,
                unitID: booking.unitID,
                checkInDate: booking.checkInDate,
                numberOfNights: booking.numberOfNights,
                checkOutDate: booking.checkOutDate,
            }
        };
    },

    extendBooking: async ({ params, body }) => {
        const existingBooking = await prisma.booking.findUnique({
            where: { id: params.id }
        });

        if (!existingBooking) {
            return {
                status: 404,
                body: "Booking not found"
            };
        }

        const extensionCheck = await isExtensionPossible(existingBooking, body.extraNights);
        if (!extensionCheck.result || !extensionCheck.previousCheckOutDate || !extensionCheck.newCheckOutDate) {
            return {
                status: 400,
                body: extensionCheck.reason
            };
        }

        const updatedBooking = await extendBookingRecord(
            existingBooking,
            body.extraNights,
            extensionCheck.previousCheckOutDate,
            extensionCheck.newCheckOutDate
        );

        return {
            status: 200,
            body: {
                id: updatedBooking.id,
                guestName: updatedBooking.guestName,
                unitID: updatedBooking.unitID,
                checkInDate: updatedBooking.checkInDate,
                numberOfNights: updatedBooking.numberOfNights,
                checkOutDate: updatedBooking.checkOutDate,
            }
        };
    }
});
