import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'mongoose-delete';
import { Registration, RegistrationDocument } from '../mongo-schemas';
import { BaseRepository } from './base.repository';
@Injectable()
export class RegistrationRepository extends BaseRepository<RegistrationDocument> {
  constructor(
    @InjectModel(Registration.name)
    model: SoftDeleteModel<RegistrationDocument>,
  ) {
    super(model);
  }
}
