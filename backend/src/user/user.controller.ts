import {
  Controller,
  Get,
  NotFoundException,
  UseGuards,
  Req,
} from '@nestjs/common';
import { UserService } from './user.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { User } from './entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; //  Importe o AuthGuard JWT
import { ExchangeService } from '../exchange/services/exchange.service'; // Import ExchangeService
import { IRequestWithUser } from 'src/common/interfaces/request-with-user.interface';
import {
  FindOneSwagger,
  GetUserStatisticsSwagger,
} from './user.controller.swagger';

@ApiTags('Users')
@ApiBearerAuth('bearerAuth')
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly exchangeService: ExchangeService, // Inject ExchangeService
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard) //  Use JWT guard for authentication
  @FindOneSwagger()
  findOne(@Req() req: IRequestWithUser): User {
    const user = req.user;
    if (!user) {
      throw new NotFoundException(`User with username not found`);
    }
    return user;
  }

  @Get('statistics')
  @GetUserStatisticsSwagger()
  async getUserStatistics(@Req() req: any): Promise<any> {
    const userId = req.user.userId;
    try {
      return await this.userService.getUserStatistics(userId);
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }
}
