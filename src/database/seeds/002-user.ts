import { cloneDeep } from 'lodash';
import { Connection } from 'mongoose';
import { Seeder } from '../seeder';
import { MasterData } from './data/user';
import { RoleType } from '../../common/constants';
import dayjs from '../../plugins/dayjs';

export default class MasterSeeder extends Seeder {
  constructor(connection: Connection) {
    super(connection);
  }
  async up() {
    const clonedData = cloneDeep(MasterData);
    const masterRole = await this.connection
      .collection('roles')
      .findOne({ type: RoleType.MASTER, isDefault: true });
    if (!masterRole) {
      console.log('Seed data failed for MASTER user: Not found MASTER role');
      return;
    }
    await this.connection.collection(clonedData.collectionName).insertOne({
      ...clonedData.data,
      roleId: masterRole._id,
      createdAt: dayjs().toDate(),
    });
    console.log(`Seed data done for ${MasterData.collectionName}`);
  }
}
