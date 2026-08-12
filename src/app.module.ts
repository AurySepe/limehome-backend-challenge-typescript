import { Module } from '@nestjs/common';
import { HealthModule } from './modules/health/health.module';
import { BookingModule } from './modules/bookings/booking.module';
import { BookingExtensionModule } from './modules/booking-extension/booking-extension.module';

@Module({
    imports: [HealthModule, BookingModule, BookingExtensionModule],
})
export class AppModule {}
