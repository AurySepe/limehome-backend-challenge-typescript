import { Controller, Post, Param, Body, ParseIntPipe, HttpException, HttpStatus, Inject, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiBadRequestResponse, ApiNotFoundResponse } from '@nestjs/swagger';
import prisma from '../../prisma';
import { BookingExtensionService } from './booking-extension.service';
import { ExtendBookingInputDto } from './booking-extension.dto';
import { BookingDto } from '../bookings/booking.dto';

@ApiTags('booking-extension')
@Controller('api/v1/booking')
export class BookingExtensionController {
    constructor(@Inject(BookingExtensionService) private readonly bookingExtensionService: BookingExtensionService) {}

    @Post(':id/extend')
    @HttpCode(200)
    @ApiOkResponse({ type: () => BookingDto, description: 'Booking extended successfully' })
    @ApiBadRequestResponse({
        description: 'Booking extension failed due to date conflict or invalid booking status',
        schema: { type: 'string', example: 'For the requested extension dates, the unit is already occupied' },
    })
    @ApiNotFoundResponse({
        description: 'Booking not found',
        schema: { type: 'string', example: 'Booking not found' },
    })
    async extendBooking(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: ExtendBookingInputDto
    ): Promise<BookingDto> {
        const updatedBooking = await prisma.$transaction(async (tx) => {
            const existingBooking = await tx.booking.findUnique({
                where: { id },
            });

            if (!existingBooking) {
                throw new HttpException('Booking not found', HttpStatus.NOT_FOUND);
            }

            const outcome = await this.bookingExtensionService.isExtensionPossible(existingBooking, body.extraNights, tx);
            if (!outcome.result) {
                throw new HttpException(outcome.reason, HttpStatus.BAD_REQUEST);
            }

            const updatedBooking = await this.bookingExtensionService.extendBookingRecord(
                existingBooking,
                body.extraNights,
                outcome.previousCheckOutDate!,
                outcome.newCheckOutDate!,
                tx
            );

            // Check inside the callback so that a failed optimistic lock causes Prisma to rollback
            // the entire transaction (including the bookingExtension.create already executed)
            if (!updatedBooking) {
                throw new HttpException('Booking was concurrently modified, please retry', HttpStatus.CONFLICT);
            }

            return updatedBooking;
        }, { isolationLevel: 'Serializable' });

        return new BookingDto({
            id: updatedBooking.id,
            guestName: updatedBooking.guestName,
            unitID: updatedBooking.unitID,
            checkInDate: updatedBooking.checkInDate,
            numberOfNights: updatedBooking.numberOfNights,
            checkOutDate: updatedBooking.checkOutDate,
        });
    }
}
