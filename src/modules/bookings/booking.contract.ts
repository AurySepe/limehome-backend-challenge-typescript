import { initContract } from '@ts-rest/core';
import { z } from 'zod';

const c = initContract();

export const BookingInputSchema = z.object({
    guestName: z.string().min(1, 'Guest name is required'),
    unitID: z.string().min(1, 'Unit ID is required'),
    checkInDate: z.string().min(1, 'Check-in date is required'),
    numberOfNights: z.number().int().positive('Number of nights must be a positive integer'),
});

export type BookingInput = z.infer<typeof BookingInputSchema>;

export const ExtendBookingInputSchema = z.object({
    extraNights: z.number().int().positive('extraNights must be a positive integer'),
});

export type ExtendBookingInput = z.infer<typeof ExtendBookingInputSchema>;

export const BookingResponseSchema = z.object({
    id: z.number().int(),
    guestName: z.string(),
    unitID: z.string(),
    checkInDate: z.date(),
    numberOfNights: z.number().int(),
    checkOutDate: z.date(),
});

export type BookingResponse = z.infer<typeof BookingResponseSchema>;

export const HealthResponseSchema = z.object({
    message: z.string(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export const bookingContract = c.router({
    healthCheck: {
        method: 'GET',
        path: '/',
        responses: {
            200: HealthResponseSchema,
        },
        summary: 'Health check endpoint',
    },
    createBooking: {
        method: 'POST',
        path: '/api/v1/booking',
        body: BookingInputSchema,
        responses: {
            200: BookingResponseSchema,
            400: z.string(),
        },
        summary: 'Create a new booking',
    },
    extendBooking: {
        method: 'POST',
        path: '/api/v1/booking/:id/extend',
        pathParams: z.object({
            id: z.coerce.number().int(),
        }),
        body: ExtendBookingInputSchema,
        responses: {
            200: BookingResponseSchema,
            400: z.string(),
            404: z.string(),
        },
        summary: 'Extend an active booking',
    },
});
