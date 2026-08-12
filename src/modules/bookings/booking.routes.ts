import { createExpressEndpoints } from '@ts-rest/express';
import express from 'express';
import { bookingContract } from './booking.contract.js';
import { bookingController } from './booking.controller.js';

const router = express.Router();

createExpressEndpoints(bookingContract, bookingController, router, {
    jsonQuery: true,
});

export default router;
