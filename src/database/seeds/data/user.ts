import {
  MongoCollection,
  UserRole,
  UserStatus,
  UserType,
} from '../../../common/constants';
import { hashPassword } from '../../../common/helpers/common.functions.helper';

export const MasterData = {
  collectionName: MongoCollection.USERS,
  data: {
    email: 'admin@gmail.com',
    phone: '0000000000',
    name: 'Do Van Dat',
    password: hashPassword('Admin@1234'),
    isTemporary: false,
    status: UserStatus.ACTIVE,
    type: UserType.NONE,
    userRole: UserRole.MASTER,
  },
};
