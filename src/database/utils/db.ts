import { Connection, createConnection } from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
let connection: Connection | null = null;

export async function getOrCreateConnection() {
  if (connection) {
    return connection;
  }
  connection = createConnection(process.env.MONGO_DATABASE_CONNECTION_STRING);
  return connection;
}
