import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, stopServer } from '../src/server.js';
import { PrismaClient } from '@prisma/client';

const BASE_URL = 'http://localhost:8000';
const prisma = new PrismaClient();

const GUEST_A_UNIT_1 = {
    unitID: '1',
    guestName: 'GuestA',
    checkInDate: new Date().toISOString().split('T')[0],
    numberOfNights: 5,
};

async function postBooking(data: object) {
    return fetch(`${BASE_URL}/api/v1/booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

async function extendBooking(id: number, data: object) {
    return fetch(`${BASE_URL}/api/v1/booking/${id}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

before(async () => {
    await startServer();
});

after(async () => {
    await prisma.$disconnect();
    await stopServer();
});

beforeEach(async () => {
    await prisma.bookingExtension.deleteMany();
    await prisma.booking.deleteMany();
});

describe('Booking Extension API', () => {
    it('Extend active booking successfully', async () => {
        const createRes = await postBooking(GUEST_A_UNIT_1);
        assert.equal(createRes.status, 200);
        const booking = await createRes.json() as { id: number; numberOfNights: number };

        const extendRes = await extendBooking(booking.id, { extraNights: 3 });
        assert.equal(extendRes.status, 200);
        const updated = await extendRes.json() as { id: number; numberOfNights: number };
        assert.equal(updated.id, booking.id);
        assert.equal(updated.numberOfNights, 8);

        // Verify BookingExtension record created in DB
        const extensions = await prisma.bookingExtension.findMany({
            where: { bookingId: booking.id }
        });
        assert.equal(extensions.length, 1);
        assert.equal(extensions[0].extraNights, 3);
    });

    it('Fail extension when unit is occupied during extended period', async () => {
        const createRes = await postBooking(GUEST_A_UNIT_1);
        assert.equal(createRes.status, 200);
        const booking = await createRes.json() as { id: number };

        // GuestB books unit 1 starting at day 6 (right after GuestA's original 5-day stay)
        const day6 = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const nextBookingRes = await postBooking({
            unitID: '1',
            guestName: 'GuestB',
            checkInDate: day6,
            numberOfNights: 3,
        });
        assert.equal(nextBookingRes.status, 200);

        // GuestA tries to extend by 2 nights (which overlaps with GuestB's booking)
        const extendRes = await extendBooking(booking.id, { extraNights: 2 });
        assert.equal(extendRes.status, 400);
        const message = await extendRes.json();
        assert.equal(message, 'For the requested extension dates, the unit is already occupied');
    });

    it('Fail extension for non-existent booking ID', async () => {
        const extendRes = await extendBooking(99999, { extraNights: 2 });
        assert.equal(extendRes.status, 404);
    });
});
