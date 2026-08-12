import { IsInt, IsPositive } from 'class-validator';
import { plainToInstance } from 'class-transformer';

export class ExtendBookingInputDto {
    @IsInt({ message: 'extraNights must be a positive integer' })
    @IsPositive({ message: 'extraNights must be a positive integer' })
    extraNights!: number;

    constructor(data: ExtendBookingInputDto) {
        Object.assign(this, plainToInstance(ExtendBookingInputDto, data));
    }
}
