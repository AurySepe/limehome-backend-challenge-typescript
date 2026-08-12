import { Controller, Post, Body, HttpException, HttpStatus, Inject, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiBadRequestResponse } from '@nestjs/swagger';
import { BookingService } from './booking.service';
import { BookingDto, CreateBookingDto } from './booking.dto';

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
        const outcome = await this.bookingService.isBookingPossible(body);
        if (!outcome.result) {
            throw new HttpException(outcome.reason, HttpStatus.BAD_REQUEST);
        }

        const booking = await this.bookingService.createBookingRecord(body);

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
