import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Match } from './entities/match.entity';
import { MatchService } from './match.service';
import { GetMatchBookSwagger } from './match.controller.swagger';
import { MatchBookItemDto } from './dto/match-book-item.dto';

@Controller('matche')
@ApiTags('Matche')
export class MatchController {
  constructor(private readonly matchService: MatchService) {}

  @Get('latest')
  @ApiOperation({ summary: 'Get the latest matches' })
  @ApiResponse({ status: 200, description: 'Latest matches', type: [Match] })
  async getLatestMatches(): Promise<Match[]> {
    return await this.matchService.getLatestMatches();
  }
  @Get('book')
  @GetMatchBookSwagger()
  async getMatchBook(): Promise<{
    buy: MatchBookItemDto[];
    sell: MatchBookItemDto[];
  }> {
    return await this.matchService.getMatchBook();
  }
}
