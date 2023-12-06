import { cloneDeep } from 'lodash';
import { Connection } from 'mongoose';
import { MongoCollection } from '../../common/constants';
import { Seeder } from '../seeder';
import { roleDefaultData } from './data/roles';
import dayjs from '../../plugins/dayjs';

export default class RoleSeeder extends Seeder {
  constructor(connection: Connection) {
    super(connection);
  }
  async up() {
    const clonedData = cloneDeep(roleDefaultData);
    const mappedData = clonedData.map((item) => ({
      ...item,
      createdAt: dayjs().toDate(),
    }));
    await this.connection
      .collection(MongoCollection.ROLES)
      .insertMany(mappedData);

    console.log(`Seed data done for ${MongoCollection.ROLES}`);
  }
}
