import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { StatisticsService } from './statistics.service';

@Controller('statistics')
@ApiTags('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('global')
  @ApiOperation({ summary: 'Get global exchange statistics' })
  @ApiResponse({
    status: 200,
    description: 'Global statistics',
    type: 'object',
  }) // Adjust the type
  async getGlobalStatistics(): Promise<any> {
    // Define a proper type
    return this.statisticsService.getGlobalStatistics();
  }
}
