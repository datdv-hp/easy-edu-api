import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'mongoose-delete';
import { Role, RoleDocument } from '../mongo-schemas/role.schema';
import { BaseRepository } from './base.repository';

@Injectable()
export class RoleRepository extends BaseRepository<RoleDocument> {
  constructor(
    @InjectModel(Role.name)
    model: SoftDeleteModel<RoleDocument>,
  ) {
    super(model);
  }
}
