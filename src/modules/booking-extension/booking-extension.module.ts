import { Module } from '@nestjs/common';
import { BookingExtensionController } from './booking-extension.controller';
import { BookingExtensionService } from './booking-extension.service';

@Module({
    controllers: [BookingExtensionController],
    providers: [BookingExtensionService],
})
export class BookingExtensionModule {}
