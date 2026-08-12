import { Controller, Post, Body, HttpException, HttpStatus, Inject, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiBadRequestResponse } from '@nestjs/swagger';
import { BookingService } from './booking.service';
import { BookingDto, CreateBookingDto } from './booking.dto';
import prisma from '../../prisma';

@ApiTags('booking')
@Controller('api/v1/booking')
export class BookingController {
    constructor(@Inject(BookingService) private readonly bookingService: BookingService) {}

    @Post()
    @HttpCode(200)
    @ApiOkResponse({ type: () => BookingDto, description: 'Booking created successfully' })
    @ApiBadRequestResponse({
        description: 'Booking creation failed due to date conflict or occupied unit',
        schema: { type: 'string', example: 'The given guest name cannot book the same unit multiple times' },
    })
    async createBooking(@Body() body: CreateBookingDto): Promise<BookingDto> {
        const booking = await prisma.$transaction(async (tx) => {
            const outcome = await this.bookingService.isBookingPossible(body, tx);
            if (!outcome.result) {
                throw new HttpException(outcome.reason, HttpStatus.BAD_REQUEST);
            }
            return this.bookingService.createBookingRecord(body, tx);
        }, { isolationLevel: 'Serializable' });

        return new BookingDto({
            id: booking.id,
            guestName: booking.guestName,
            unitID: booking.unitID,
            checkInDate: booking.checkInDate,
            numberOfNights: booking.numberOfNights,
            checkOutDate: booking.checkOutDate,
        });
    }
}
