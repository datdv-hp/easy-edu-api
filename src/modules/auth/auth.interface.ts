import { TokenType } from '@/common/constants';
import { Types } from 'mongoose';
import { AuthProvider } from './auth.constant';

export interface ICreateUserTokenBody {
  userId: Types.ObjectId;
  token: string;
  hashToken: string;
  type: TokenType;
  createdBy?: Types.ObjectId;
  deletedAt?: Date;
}

export interface ILoginBody {
  provider: AuthProvider;
  email?: string;
  password?: string;
  token?: string;
  redirectUri?: string;
}
