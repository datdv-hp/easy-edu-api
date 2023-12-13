import { MongoCollection } from '../../common/constants';
import { masterRole } from '../seeds/data/roles';
import { getOrCreateConnection } from '../utils/db';

export const up = async () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const connection = await getOrCreateConnection();
  await connection
    .collection(MongoCollection.ROLES)
    .updateOne(
      { isMaster: true },
      { $set: { features: JSON.stringify(masterRole) } },
    );
  console.log('Update master role successfully');
  // write your upgrade script below
};

export const down = async () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const connection = await getOrCreateConnection();

  // write your downgrade script below
};
