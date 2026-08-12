import { getCheckOutDate, getOverlapFilter } from './booking.service';

describe('BookingService Utility Functions', () => {
    it('Calculates check-out date correctly', () => {
        const checkIn = new Date('2026-06-01T00:00:00.000Z');
        const checkOut = getCheckOutDate(checkIn, 5);

        expect(checkOut.toISOString().split('T')[0]).toBe('2026-06-06');
    });

    it('Generates correct Prisma overlap filter', () => {
        const checkIn = new Date('2026-06-01');
        const checkOut = new Date('2026-06-06');
        const filter = getOverlapFilter(checkIn, checkOut);

        expect(filter).toEqual({
            checkInDate: { lt: checkOut },
            checkOutDate: { gt: checkIn },
        });
    });
});
