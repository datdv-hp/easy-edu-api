import { Connection } from 'mongoose';
import { MongoCollection } from '../../common/constants';
import dayjs from '../../plugins/dayjs';
import { SettingType, TimeKeepingType } from '../constants';
import { Seeder } from '../seeder';

export default class TimekeepingSeeder extends Seeder {
  constructor(connection: Connection) {
    super(connection);
  }
  async up() {
    const data = {
      type: SettingType.TIMEKEEPING,
      value: JSON.stringify({
        isEndOfMonth: true,
        date: null,
        type: TimeKeepingType.CUTOFF_DATE,
      }),
      createdAt: dayjs().toDate(),
    };
    await this.connection
      .collection(MongoCollection.GENERAL_SETTINGS)
      .insertOne(data);

    console.log(`Seed data done for ${MongoCollection.GENERAL_SETTINGS}`);
  }
}
