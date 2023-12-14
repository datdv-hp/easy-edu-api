import {
  DateFormat,
  MongoCollection,
  OrderDirection,
  UserRole,
  UserType,
} from '@/common/constants';
import { generateNextCode } from '@/common/helpers/common.functions.helper';
import { BaseService } from '@/common/services/base.service';
import {
  ClassroomStatus,
  CodePrefix,
  DELETE_COND,
  RegistrationStatus,
  UserVerifyType,
} from '@/database/constants';
import { Classroom, User } from '@/database/mongo-schemas';
import {
  ClassroomRepository,
  CourseRepository,
  RegistrationRepository,
  UserCourseRepository,
  UserRepository,
  UserVerifyRepository,
} from '@/database/repositories';
import { MailService } from '@/modules/mail/mail.service';
import dayjs from '@/plugins/dayjs';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { forEach } from 'lodash';
import { FilterQuery, PipelineStage, ProjectionType, Types } from 'mongoose';
import {
  IStudentClassroomFilter,
  IStudentCreateFormData,
  IStudentFilter,
  IStudentUpdateFormData,
} from '../user.interfaces';
@Injectable()
export class StudentService extends BaseService {
  constructor(
    protected readonly configService: ConfigService,
    private readonly repo: UserRepository,
    private readonly userVerifyRepo: UserVerifyRepository,
    private readonly mailService: MailService,
    private readonly userCourseRepo: UserCourseRepository,
    private readonly courseRepo: CourseRepository,
    private readonly classroomRepo: ClassroomRepository,
    private readonly registrationRepo: RegistrationRepository,
  ) {
    super(StudentService.name, configService);
  }

  private get model() {
    return this.repo.model;
  }

  async createStudent(dto: IStudentCreateFormData, createdBy: string) {
    const session = await this.model.startSession();
    try {
      session.startTransaction();
      const latestTeacher = await this.repo
        .findLatestUserOfYear(UserType.TEACHER)
        .lean()
        .exec();
      const teacherCode = latestTeacher?.code;
      const code = generateNextCode(CodePrefix.STUDENT, teacherCode);
      const newUser = new this.model({
        ...dto,
        code,
        userRole: UserRole.USER,
        role: dto.roleId,
        type: UserType.STUDENT,
      });
      const createdUser = await newUser.save({ session });
      const userCourses = dto.studentDetail?.courses.map((course) => ({
        userId: createdUser._id,
        courseId: course.courseId,
        subjectIds: course?.subjectIds,
        createdBy: createdBy,
        presenterId: course?.presenterId,
      }));
      await this.userCourseRepo.createMany(userCourses, { session });

      const verifyData = {
        userId: createdUser._id,
        code: randomUUID(),
        type: UserVerifyType.ACTIVE_ACCOUNT,
      };
      await this.userVerifyRepo.create(verifyData, { session });

      if (dto.registrationId) {
        await this.registrationRepo
          .updateOne(
            { _id: dto.registrationId },
            { status: RegistrationStatus.APPROVED },
            { session },
          )
          .lean()
          .exec();
      }

      await this.mailService.sendVerifyEmail({
        email: dto.email,
        name: dto.name,
        code: verifyData.code,
      });

      this.logger.info(
        `Created user: ${createdUser._id} with email: ${createdUser.email}`,
      );
      await session.commitTransaction();
      return createdUser;
    } catch (error) {
      await session.abortTransaction();
      this.logger.error('Error in createStudent service', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async findByIds(
    ids: (Types.ObjectId | string)[],
    select?: ProjectionType<User>,
  ) {
    const students = await this.model
      .find({ _id: { $in: ids }, type: UserType.STUDENT }, select)
      .lean()
      .exec();
    return students;
  }

  async findAllWithPaging(params: IStudentFilter) {
    try {
      const filter: FilterQuery<User> = { $and: [{ type: UserType.STUDENT }] };
      if (params.keyword) {
        filter.$and.push({
          $or: [
            { name: { $regex: `.*${params.keyword}.*`, $options: 'i' } },
            { code: { $regex: `.*${params.keyword}.*`, $options: 'i' } },
            { phone: { $regex: `.*${params.keyword}.*`, $options: 'i' } },
            { email: { $regex: `.*${params.keyword}.*`, $options: 'i' } },
          ],
        });
      }
      if (params.courseIds?.length) {
        const studentCourses = await this.userCourseRepo.model
          .find({ course: { $in: params.courseIds } }, ['userId'])
          .lean()
          .exec();
        const studentIds = studentCourses.map((student) => student.userId);
        filter.$and.push({ _id: { $in: studentIds } });
      }
      const { orderBy, skip, limit } = params;
      const orderDirection =
        params.orderDirection === OrderDirection.ASC ? 1 : -1;

      const pipelines: PipelineStage[] = [
        { $match: filter },
        {
          $project: {
            code: 1,
            name: 1,
            phone: 1,
            email: 1,
            status: 1,
            createdAt: 1,
            userRole: 1,
          },
        },
        {
          $facet: {
            data: [
              { $sort: { [orderBy]: orderDirection } },
              { $skip: skip },
              { $limit: limit },
            ],
            count: [{ $count: 'total' }],
          },
        },
      ];
      const [result] = await this.model.aggregate(pipelines).exec();
      const items = result.data || [];
      const totalItems = result.count?.[0]?.total || 0;

      // Get course info of student
      if (items.length) {
        const studentIds = items.map((item) => item._id);
        const userCourses = await this.userCourseRepo.model
          .aggregate([
            { $match: { userId: { $in: studentIds } } },
            {
              $group: {
                _id: '$userId',
                courseIds: { $push: '$courseId' },
              },
            },
          ])
          .exec();
        const _userCourses: { _id: string; courseIds: string[] }[] = JSON.parse(
          JSON.stringify(userCourses),
        );
        const _userCoursesObj: Record<string, string[]> = Object.fromEntries(
          _userCourses?.map((item) => [item._id, item.courseIds]),
        );
        const coursesSet = new Set<string>();
        _userCourses?.forEach((item) => {
          item.courseIds?.forEach((id) => coursesSet.add(id));
        });

        const courses = await this.courseRepo
          .findByIds(Array.from(coursesSet), { name: 1 })
          .lean()
          .exec();

        // { courseId: courseName }
        const coursesById = Object.fromEntries(
          courses.map((item) => [item._id.toString(), item]),
        );
        items.forEach((item) => {
          item.courses = _userCoursesObj[item._id.toString()].map(
            (courseId) => coursesById[courseId],
          );
        });
      }

      return { items, totalItems };
    } catch (error) {
      this.logger.error('Error in findAllWithPaging service', error);
      throw error;
    }
  }

  async findOneById(id: Types.ObjectId | string) {
    try {
      return await this.model
        .findOne({ _id: id, type: UserType.STUDENT })
        .lean();
    } catch (error) {
      this.logger.error('Error in findOneById service', error);
      throw error;
    }
  }

  async getDetail(id: string) {
    try {
      const pipelines: PipelineStage[] = [
        { $match: { _id: new Types.ObjectId(id), type: UserType.STUDENT } },
        {
          $lookup: {
            from: MongoCollection.ROLES,
            localField: 'roleId',
            foreignField: '_id',
            as: 'role',
            pipeline: [{ $match: DELETE_COND }, { $project: { name: 1 } }],
          },
        },
        { $unwind: '$role' },
        {
          $project: {
            name: 1,
            code: 1,
            email: 1,
            dob: 1,
            gender: 1,
            studentDetail: 1,
            status: 1,
            phone: 1,
            role: 1,
            avatar: 1,
          },
        },
      ];
      const [user] = await this.model.aggregate(pipelines).exec();
      const userCourses = await this.userCourseRepo.find(
        { userId: id },
        { courseId: 1, subjectIds: 1, presenterId: 1 },
      );
      const studentCourseInfo = userCourses.map((item) => ({
        courseId: item.courseId,
        subjectIds: item.subjectIds,
        presenterId: item.presenterId,
      }));
      const courseIds = userCourses.map((item) => item.courseId);
      const courses = await this.courseRepo
        .find({ _id: { $in: courseIds } }, { name: 1 })
        .lean()
        .exec();
      Object.assign(user, {
        courses,
        studentDetail: {
          courses: studentCourseInfo,
          degree: user.studentDetail?.degree,
        },
      });
      return user;
    } catch (error) {
      this.logger.error('Error in getStudentInfoById service', error);
      throw error;
    }
  }

  async findClassesByStudentId(
    studentId: string,
    params: IStudentClassroomFilter,
  ) {
    try {
      // get today
      const today = dayjs().format(DateFormat.YYYY_MM_DD_HYPHEN);
      const filter: FilterQuery<Classroom> = {
        $and: [{ participantIds: new Types.ObjectId(studentId) }],
      };
      // filter by class status

      if (params.status == ClassroomStatus.OPENING) {
        filter.startDate = { $lte: today };
        filter.endDate = { $gte: today };
      } else if (params.status == ClassroomStatus.COMING) {
        filter.startDate = { $gt: today };
      } else if (params.status == ClassroomStatus.FINISHED) {
        filter.endDate = { $lt: today };
      }

      const { orderBy, skip, limit } = params;
      const orderDirection =
        params.orderDirection === OrderDirection.ASC ? 1 : -1;
      const pipelines: PipelineStage[] = [
        { $match: filter },
        {
          $lookup: {
            from: MongoCollection.COURSES,
            localField: 'courseId',
            foreignField: '_id',
            as: 'course',
            pipeline: [{ $project: { name: 1 } }],
          },
        },
        { $unwind: '$course' },
        {
          $project: {
            name: 1,
            code: 1,
            startDate: 1,
            endDate: 1,
            course: 1,
            createdAt: 1,
          },
        },
        {
          $facet: {
            data: [
              { $sort: { [orderBy]: orderDirection } },
              { $skip: skip },
              { $limit: limit },
            ],
            count: [{ $count: 'total' }],
          },
        },
      ];
      const [result] = await this.classroomRepo.model.aggregate(pipelines);
      const items = result.data;
      const totalItems = result.count?.[0]?.total || 0;
      return { items, totalItems };
    } catch (error) {
      this.logger.error('Error in findClassesByStudentId service', error);
      throw error;
    }
  }

  async updateStudent(
    id: Types.ObjectId | string,
    dto: IStudentUpdateFormData & { updatedBy: Types.ObjectId | string },
  ) {
    const session = await this.model.startSession();
    try {
      session.startTransaction();
      const updatedStudent = await this.model.findByIdAndUpdate(id, dto, {
        new: true,
        runValidators: true,
        session,
        lean: true,
      });

      if (dto.studentDetail) {
        const { removeCourseIds, updateCourseData } = dto;
        if (removeCourseIds.length) {
          await this.userCourseRepo
            .delete(
              { courseId: { $in: removeCourseIds }, userId: id },
              dto.updatedBy,
            )
            .session(session)
            .lean()
            .exec();
        }
        const query = [];
        forEach(updateCourseData, (params, courseId) => {
          query.push({
            updateOne: {
              filter: { userId: id, courseId },
              update: {
                $set: {
                  subjectIds: params.subjectIds,
                  presenterId: params.presenterId,
                  updatedBy: dto.updatedBy,
                },
              },
              upsert: true,
            },
          });
        });
        await this.userCourseRepo.model.bulkWrite(query, { session });
      }

      // when remove course of student => remove student in classroom have this course
      if (dto.removeCourseIds) {
        await this.classroomRepo.model.updateMany(
          { courseId: { $in: dto.removeCourseIds }, participantIds: id },
          { $pull: { participantIds: id } },
          { session },
        );
      }
      await session.commitTransaction();
      return updatedStudent;
    } catch (error) {
      await session.abortTransaction();
      this.logger.error('Error in updateStudent service', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }
  async deleteStudentByIds(
    ids: (Types.ObjectId | string)[],
    deletedBy: Types.ObjectId | string,
  ): Promise<void> {
    const session = await this.model.startSession();
    try {
      session.startTransaction();
      await this.repo
        .delete({ _id: { $in: ids } }, deletedBy)
        .session(session)
        .lean()
        .exec();
      await this.userCourseRepo
        .delete({ user: { $in: ids } }, deletedBy)
        .session(session)
        .lean()
        .exec();

      const classrooms = await this.classroomRepo
        .find({ participantIds: { $in: ids } })
        .session(session)
        .lean()
        .exec();

      const classroomIds = classrooms.map((classroom) => classroom._id);
      await this.classroomRepo.updateMany(
        { _id: { $in: classroomIds } },
        { $pull: { participantIds: { $in: ids } } },
        { session },
      );

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      this.logger.error('Error in deleteStudentByIds service', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }
}
