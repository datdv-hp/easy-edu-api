import {
  CreateOptions,
  Document,
  FilterQuery,
  ProjectionType,
  QueryOptions,
  SaveOptions,
  Types,
  UpdateQuery,
  UpdateWithAggregationPipeline,
} from 'mongoose';
import { SoftDeleteModel } from 'mongoose-delete';

export class BaseRepository<T extends Omit<Document, 'delete'>> {
  model: SoftDeleteModel<T>;
  constructor(model: SoftDeleteModel<T>) {
    this.model = model;
  }

  findOne(filter: FilterQuery<T>, projection?: ProjectionType<T> | null) {
    return this.model.findOne(filter, projection);
  }

  findById(id: string | Types.ObjectId, projection?: ProjectionType<T> | null) {
    return this.model.findById(id, projection);
  }

  find(filter: FilterQuery<T>, projection?: ProjectionType<T> | null) {
    return this.model.find(filter, projection);
  }
  findByIds(
    ids: (string | Types.ObjectId)[],
    projection?: ProjectionType<T> | null,
  ) {
    return this.model.find({ _id: { $in: ids } }, projection);
  }

  findByIdAndUpdate(
    id: string | Types.ObjectId,
    update: UpdateQuery<T>,
    options: QueryOptions<T> | null = { new: true },
  ) {
    return this.model.findByIdAndUpdate(id, update, options);
  }

  findOneAndUpdate(
    filter: FilterQuery<T>,
    update: UpdateQuery<T>,
    options: QueryOptions<T> | null = { new: true },
  ) {
    return this.model.findOneAndUpdate(filter, update, options);
  }

  allExistedByIds(ids: (string | Types.ObjectId)[]) {
    return this.model.find({ _id: { $in: ids } }, ['_id']);
  }

  allExistedByFields(filter: FilterQuery<T>) {
    return this.model.find(filter, ['_id']);
  }

  existedByFields(filter: FilterQuery<T>) {
    return this.model.exists(filter);
  }
  existedById(id: string | Types.ObjectId) {
    return this.model.exists({ _id: id });
  }

  create(entity: Partial<T | any>, options?: SaveOptions) {
    const newEntity = new this.model(entity);
    return newEntity.save(options);
  }

  createMany(entities: Array<any>, options?: CreateOptions) {
    return this.model.create(entities, options);
  }

  updateMany(
    filter: FilterQuery<T>,
    update: UpdateQuery<T> | UpdateWithAggregationPipeline,
    options: QueryOptions | null = null,
  ) {
    return this.model.updateMany(filter, update, options);
  }

  updateOne(
    filter: FilterQuery<T>,
    update: UpdateQuery<T> | UpdateWithAggregationPipeline,
    options: QueryOptions | null = null,
  ) {
    return this.model.updateOne(filter, update, options);
  }

  delete(filter: FilterQuery<T>, deletedBy: string | Types.ObjectId) {
    return this.model.delete(filter, deletedBy);
  }
}
