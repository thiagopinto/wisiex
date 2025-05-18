import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: 'Nome de usuário para login' })
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  username: string;
}
