import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, stopServer } from '../src/server';
import { PrismaClient } from '@prisma/client';

const BASE_URL = 'http://localhost:8000';
const prisma = new PrismaClient();

const GUEST_A_UNIT_1 = {
    unitID: '1',
    guestName: 'GuestA',
    checkInDate: new Date().toISOString().split('T')[0],
    numberOfNights: 5,
};

const GUEST_A_UNIT_2 = {
    unitID: '2',
    guestName: 'GuestA',
    checkInDate: new Date().toISOString().split('T')[0],
    numberOfNights: 5,
};

const GUEST_B_UNIT_1 = {
    unitID: '1',
    guestName: 'GuestB',
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

before(async () => {
    await startServer();
});

after(async () => {
    await prisma.$disconnect();
    await stopServer();
});

beforeEach(async () => {
    await prisma.booking.deleteMany();
});

describe('Booking API', () => {
    it('Create fresh booking', async () => {
        const response = await postBooking(GUEST_A_UNIT_1);
        assert.equal(response.status, 200);
        const data = await response.json() as Record<string, unknown>;
        assert.equal(data.guestName, GUEST_A_UNIT_1.guestName);
        assert.equal(data.unitID, GUEST_A_UNIT_1.unitID);
        assert.equal(data.numberOfNights, GUEST_A_UNIT_1.numberOfNights);
    });

    it('Same guest same unit booking', async () => {
        let response = await postBooking(GUEST_A_UNIT_1);
        assert.equal(response.status, 200);

        response = await postBooking(GUEST_A_UNIT_1);
        assert.equal(response.status, 400);
        const message = await response.json();
        assert.equal(message, 'The given guest name cannot book the same unit multiple times');
    });

    it('Same guest different unit booking', async () => {
        let response = await postBooking(GUEST_A_UNIT_1);
        assert.equal(response.status, 200);

        response = await postBooking(GUEST_A_UNIT_2);
        assert.equal(response.status, 400);
        const message = await response.json();
        assert.equal(message, 'The same guest cannot be in multiple units at the same time');
    });

    it('Different guest same unit booking', async () => {
        let response = await postBooking(GUEST_A_UNIT_1);
        assert.equal(response.status, 200);

        response = await postBooking(GUEST_B_UNIT_1);
        assert.equal(response.status, 400);
        const message = await response.json();
        assert.equal(message, 'For the given check-in date, the unit is already occupied');
    });

    it('Different guest same unit booking different date', async () => {
        const response1 = await postBooking(GUEST_A_UNIT_1);
        assert.equal(response1.status, 200);

        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const response2 = await postBooking({
            unitID: '1',
            guestName: 'GuestB',
            checkInDate: tomorrow,
            numberOfNights: 5,
        });
        assert.equal(response2.status, 400);
        const message = await response2.json();
        assert.equal(message, 'For the given check-in date, the unit is already occupied');
    });

    it('Same guest same unit booking non-overlapping future dates', async () => {
        const response1 = await postBooking(GUEST_A_UNIT_1);
        assert.equal(response1.status, 200);

        // Book 10 days in the future (after the 5 nights stay ends)
        const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const response2 = await postBooking({
            unitID: '1',
            guestName: 'GuestA',
            checkInDate: futureDate,
            numberOfNights: 3,
        });
        assert.equal(response2.status, 200);
    });
});
