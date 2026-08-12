import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createTestApp } from '../../../test/test-app';

describe('Health Check API', () => {
    let app: INestApplication;

    beforeAll(async () => {
        app = await createTestApp();
    });

    afterAll(async () => {
        if (app) {
            await app.close();
        }
    });

    it('Health check endpoint returns status 200 and OK message', async () => {
        const response = await request(app.getHttpServer())
            .get('/')
            .expect(200);

        expect(response.body).toEqual({ message: 'OK' });
    });
});
