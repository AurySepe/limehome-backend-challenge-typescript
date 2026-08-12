import { Controller, Post, Param, Body, ParseIntPipe, ParseUUIDPipe, HttpException, HttpStatus, Inject, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiBadRequestResponse, ApiNotFoundResponse, ApiHeader } from '@nestjs/swagger';
import prisma from '../../prisma';
import { BookingExtensionService } from './booking-extension.service';
import { ExtendBookingInputDto } from './booking-extension.dto';
import { BookingDto } from '../bookings/booking.dto';
import { IdempotencyKey } from '../../common/decorators/idempotency-key.decorator';

@ApiTags('booking-extension')
@Controller('api/v1/booking')
export class BookingExtensionController {
    constructor(@Inject(BookingExtensionService) private readonly bookingExtensionService: BookingExtensionService) {}

    @Post(':id/extend')
    @HttpCode(200)
    @ApiHeader({
        name: 'Idempotency-Key',
        required: true,
        description: 'Mandatory UUID string to prevent duplicate stay extensions',
        schema: {
            type: 'string',
            format: 'uuid',
            example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
        },
    })
    @ApiOkResponse({ type: () => BookingDto, description: 'Booking extended successfully' })
    @ApiBadRequestResponse({
        description: 'Booking extension failed due to date conflict, invalid booking status, or missing/invalid Idempotency-Key',
        schema: { type: 'string', example: 'For the requested extension dates, the unit is already occupied' },
    })
    @ApiNotFoundResponse({
        description: 'Booking not found',
        schema: { type: 'string', example: 'Booking not found' },
    })
    async extendBooking(
        @Param('id', ParseIntPipe) id: number,
        @IdempotencyKey(new ParseUUIDPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST })) idempotencyKey: string,
        @Body() body: ExtendBookingInputDto
    ): Promise<BookingDto> {
        const updatedBooking = await prisma.$transaction(async (tx) => {
            const existingBooking = await tx.booking.findUnique({
                where: { id },
            });

            if (!existingBooking) {
                throw new HttpException('Booking not found', HttpStatus.NOT_FOUND);
            }

            const existingExtension = await this.bookingExtensionService.findExistingExtensionByIdempotencyKey(
                id,
                idempotencyKey,
                tx
            );

            if (existingExtension) {
                return existingBooking;
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
                idempotencyKey,
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
