import { IsString } from 'class-validator';
import { plainToInstance } from 'class-transformer';

export class HealthResponseDto {
    @IsString()
    message!: string;

    constructor(data: HealthResponseDto) {
        Object.assign(this, plainToInstance(HealthResponseDto, data));
    }
}
