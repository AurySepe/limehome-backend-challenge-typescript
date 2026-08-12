import express from 'express';
import controller from '../controllers/bookings.js';
const router = express.Router();

router.get('/', controller.healthCheck);
router.post('/api/v1/booking/', controller.createBooking);
router.post('/api/v1/booking/:id/extend', controller.extendBooking);

export default router;

