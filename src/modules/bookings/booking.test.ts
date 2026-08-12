import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createTestApp } from '../../../test/test-app';
import { PrismaClient } from '@prisma/client';

describe('Booking Creation API', () => {
    let app: INestApplication;
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

    beforeAll(async () => {
        app = await createTestApp();
    });

    afterAll(async () => {
        await prisma.$disconnect();
        if (app) {
            await app.close();
        }
    });

    beforeEach(async () => {
        await prisma.bookingExtension.deleteMany();
        await prisma.booking.deleteMany();
    });

    it('Create fresh booking', async () => {
        const response = await request(app.getHttpServer())
            .post('/api/v1/booking')
            .send(GUEST_A_UNIT_1)
            .expect(200);

        expect(response.body.guestName).toBe(GUEST_A_UNIT_1.guestName);
        expect(response.body.unitID).toBe(GUEST_A_UNIT_1.unitID);
        expect(response.body.numberOfNights).toBe(GUEST_A_UNIT_1.numberOfNights);
    });

    it('Same guest same unit booking', async () => {
        await request(app.getHttpServer())
            .post('/api/v1/booking')
            .send(GUEST_A_UNIT_1)
            .expect(200);

        const response = await request(app.getHttpServer())
            .post('/api/v1/booking')
            .send(GUEST_A_UNIT_1)
            .expect(400);

        expect(response.body).toBe('The given guest name cannot book the same unit multiple times');
    });

    it('Same guest different unit booking', async () => {
        await request(app.getHttpServer())
            .post('/api/v1/booking')
            .send(GUEST_A_UNIT_1)
            .expect(200);

        const response = await request(app.getHttpServer())
            .post('/api/v1/booking')
            .send(GUEST_A_UNIT_2)
            .expect(400);

        expect(response.body).toBe('The same guest cannot be in multiple units at the same time');
    });

    it('Different guest same unit booking', async () => {
        await request(app.getHttpServer())
            .post('/api/v1/booking')
            .send(GUEST_A_UNIT_1)
            .expect(200);

        const response = await request(app.getHttpServer())
            .post('/api/v1/booking')
            .send(GUEST_B_UNIT_1)
            .expect(400);

        expect(response.body).toBe('For the given check-in date, the unit is already occupied');
    });

    it('Different guest same unit booking different date', async () => {
        await request(app.getHttpServer())
            .post('/api/v1/booking')
            .send(GUEST_A_UNIT_1)
            .expect(200);

        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const response = await request(app.getHttpServer())
            .post('/api/v1/booking')
            .send({
                unitID: '1',
                guestName: 'GuestB',
                checkInDate: tomorrow,
                numberOfNights: 5,
            })
            .expect(400);

        expect(response.body).toBe('For the given check-in date, the unit is already occupied');
    });

    it('Same guest same unit booking non-overlapping future dates', async () => {
        await request(app.getHttpServer())
            .post('/api/v1/booking')
            .send(GUEST_A_UNIT_1)
            .expect(200);

        const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        await request(app.getHttpServer())
            .post('/api/v1/booking')
            .send({
                unitID: '1',
                guestName: 'GuestA',
                checkInDate: futureDate,
                numberOfNights: 3,
            })
            .expect(200);
    });

    it('Concurrent identical requests create at most one booking', async () => {
        const [res1, res2] = await Promise.all([
            request(app.getHttpServer()).post('/api/v1/booking').send(GUEST_A_UNIT_1),
            request(app.getHttpServer()).post('/api/v1/booking').send(GUEST_A_UNIT_1),
        ]);

        const winner = [res1, res2].find(r => r.status === 200);
        const loser = [res1, res2].find(r => r.status !== 200);

        // Exactly one request must succeed and one must be rejected
        expect(winner).toBeDefined();
        expect(loser).toBeDefined();

        // The rejected request must return a 400 with a known conflict message
        expect(loser!.status).toBe(400);
        expect([
            'The given guest name cannot book the same unit multiple times',
            'The same guest cannot be in multiple units at the same time',
            'For the given check-in date, the unit is already occupied',
        ]).toContain(loser!.body);

        // Regardless of HTTP outcome, the database must contain exactly one booking
        const bookings = await prisma.booking.findMany({
            where: { unitID: GUEST_A_UNIT_1.unitID, guestName: GUEST_A_UNIT_1.guestName },
        });
        expect(bookings).toHaveLength(1);
    });
});
