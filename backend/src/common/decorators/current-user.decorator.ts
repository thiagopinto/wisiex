import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User as UserEntity } from '../../user/entities/user.entity';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserEntity => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as UserEntity;
  },
);
