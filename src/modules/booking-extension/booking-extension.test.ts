import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createTestApp } from '../../../test/test-app';
import { PrismaClient } from '@prisma/client';

describe('Booking Extension API', () => {
    let app: INestApplication;
    const prisma = new PrismaClient();

    const GUEST_A_UNIT_1 = {
        unitID: '1',
        guestName: 'GuestA',
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

    it('Extend active booking successfully', async () => {
        const createRes = await request(app.getHttpServer())
            .post('/api/v1/booking')
            .send(GUEST_A_UNIT_1)
            .expect(200);

        const booking = createRes.body;

        const extendRes = await request(app.getHttpServer())
            .post(`/api/v1/booking/${booking.id}/extend`)
            .set('Idempotency-Key', '11111111-1111-4111-a111-111111111111')
            .send({ extraNights: 3 })
            .expect(200);

        expect(extendRes.body.id).toBe(booking.id);
        expect(extendRes.body.numberOfNights).toBe(8);

        const extensions = await prisma.bookingExtension.findMany({
            where: { bookingId: booking.id }
        });
        expect(extensions.length).toBe(1);
        expect(extensions[0].extraNights).toBe(3);
        expect(extensions[0].idempotencyKey).toBe('11111111-1111-4111-a111-111111111111');
    });

    it('Fail extension when Idempotency-Key header is missing', async () => {
        const createRes = await request(app.getHttpServer())
            .post('/api/v1/booking')
            .send(GUEST_A_UNIT_1)
            .expect(200);

        const booking = createRes.body;

        await request(app.getHttpServer())
            .post(`/api/v1/booking/${booking.id}/extend`)
            .send({ extraNights: 2 })
            .expect(400);
    });

    it('Fail extension when Idempotency-Key header is not a valid UUID', async () => {
        const createRes = await request(app.getHttpServer())
            .post('/api/v1/booking')
            .send(GUEST_A_UNIT_1)
            .expect(200);

        const booking = createRes.body;

        await request(app.getHttpServer())
            .post(`/api/v1/booking/${booking.id}/extend`)
            .set('Idempotency-Key', 'not-a-valid-uuid')
            .send({ extraNights: 2 })
            .expect(400);
    });

    it('Idempotent duplicate request returns 200 OK without extending stay twice', async () => {
        const createRes = await request(app.getHttpServer())
            .post('/api/v1/booking')
            .send(GUEST_A_UNIT_1)
            .expect(200);

        const booking = createRes.body;
        const key = '22222222-2222-4222-a222-222222222222';

        // First call: extends booking from 5 to 7 nights
        const res1 = await request(app.getHttpServer())
            .post(`/api/v1/booking/${booking.id}/extend`)
            .set('Idempotency-Key', key)
            .send({ extraNights: 2 })
            .expect(200);

        expect(res1.body.numberOfNights).toBe(7);

        // Second call with same idempotency key: returns 200 OK with same numberOfNights (7)
        const res2 = await request(app.getHttpServer())
            .post(`/api/v1/booking/${booking.id}/extend`)
            .set('Idempotency-Key', key)
            .send({ extraNights: 2 })
            .expect(200);

        expect(res2.body.numberOfNights).toBe(7);

        const extensions = await prisma.bookingExtension.findMany({
            where: { bookingId: booking.id }
        });
        expect(extensions.length).toBe(1);
    });

    it('Fail extension when unit is occupied during extended period', async () => {
        const createRes = await request(app.getHttpServer())
            .post('/api/v1/booking')
            .send(GUEST_A_UNIT_1)
            .expect(200);

        const booking = createRes.body;

        const day6 = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        await request(app.getHttpServer())
            .post('/api/v1/booking')
            .send({
                unitID: '1',
                guestName: 'GuestB',
                checkInDate: day6,
                numberOfNights: 3,
            })
            .expect(200);

        const extendRes = await request(app.getHttpServer())
            .post(`/api/v1/booking/${booking.id}/extend`)
            .set('Idempotency-Key', '33333333-3333-4333-a333-333333333333')
            .send({ extraNights: 2 })
            .expect(400);

        expect(extendRes.body).toBe('For the requested extension dates, the unit is already occupied');
    });

    it('Fail extension for non-existent booking ID', async () => {
        await request(app.getHttpServer())
            .post('/api/v1/booking/99999/extend')
            .set('Idempotency-Key', '44444444-4444-4444-a444-444444444444')
            .send({ extraNights: 2 })
            .expect(404);
    });
});
