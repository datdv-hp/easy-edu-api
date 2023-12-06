import { Injectable } from '@nestjs/common';
import { Connection } from 'mongoose';

@Injectable()
export abstract class Seeder {
  connection: Connection;

  constructor(_connection: Connection) {
    this.connection = _connection;
  }

  abstract up(): Promise<void>;

  down(): Promise<void> {
    return Promise.resolve();
  }
}
