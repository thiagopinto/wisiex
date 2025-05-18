import { Request } from 'express';
import { User as UserEntity } from '../../user/entities/user.entity';

export interface IRequestWithUser extends Request {
  user: UserEntity;
}
