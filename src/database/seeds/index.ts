import env from 'dotenv';
import mongoose from 'mongoose';
import RoleSeeder from './001-role';
import MasterSeeder from './002-user';
import TimekeepingSeeder from './003-timekeeping-setting';

(async function () {
  env.config();
  const connection = mongoose.createConnection(
    process.env.MONGO_DATABASE_CONNECTION_STRING,
  );

  const roleSeeder = new RoleSeeder(connection);
  await roleSeeder.up();

  const masterSeeder = new MasterSeeder(connection);
  await masterSeeder.up();

  const timekeepingSettingSeeder = new TimekeepingSeeder(connection);
  await timekeepingSettingSeeder.up();

  await connection.destroy();
})();
