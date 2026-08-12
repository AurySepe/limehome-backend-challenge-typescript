import { IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';
import { plainToInstance } from 'class-transformer';

export class BookingDto {
    @IsInt()
    id!: number;

    @IsString()
    @IsNotEmpty({ message: 'Guest name is required' })
    guestName!: string;

    @IsString()
    @IsNotEmpty({ message: 'Unit ID is required' })
    unitID!: string;

    checkInDate!: Date;

    @IsInt()
    numberOfNights!: number;

    checkOutDate!: Date;

    constructor(data: BookingDto) {
        Object.assign(this, plainToInstance(BookingDto, data));
    }
}

export class CreateBookingDto {
    @IsString()
    @IsNotEmpty({ message: 'Guest name is required' })
    guestName!: string;

    @IsString()
    @IsNotEmpty({ message: 'Unit ID is required' })
    unitID!: string;

    @IsString()
    @IsNotEmpty({ message: 'Check-in date is required' })
    checkInDate!: string;

    @IsInt({ message: 'Number of nights must be a positive integer' })
    @IsPositive({ message: 'Number of nights must be a positive integer' })
    numberOfNights!: number;

    constructor(data: CreateBookingDto) {
        Object.assign(this, plainToInstance(CreateBookingDto, data));
    }
}
