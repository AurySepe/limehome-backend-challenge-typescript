import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HealthResponseDto } from './health.dto';

@ApiTags('health')
@Controller()
export class HealthController {
    @Get()
    async healthCheck(): Promise<HealthResponseDto> {
        return new HealthResponseDto({
            message: 'OK',
        });
    }
}
