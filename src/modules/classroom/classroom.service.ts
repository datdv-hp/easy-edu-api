import {
  DateFormat,
  MongoCollection,
  OrderDirection,
  RoleType,
} from '@/common/constants';
import {
  generateNextCode,
  sto,
  stos,
} from '@/common/helpers/common.functions.helper';
import { BaseService } from '@/common/services/base.service';
import { CodePrefix, DELETE_COND } from '@/database/constants';
import { Classroom, Lesson, Syllabus } from '@/database/mongo-schemas';
import {
  ClassroomRepository,
  CourseRepository,
  LectureRepository,
  LessonRepository,
  SyllabusRepository,
  TimekeepingRepository,
  TuitionRepository,
  UserCourseRepository,
  UserRepository,
} from '@/database/repositories';
import dayjs from '@/plugins/dayjs';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { difference, forEach, get, uniq } from 'lodash';
import { FilterQuery, PipelineStage, Types } from 'mongoose';
import { addFieldStatusPipeline } from './classroom.helpers';
import {
  IClassFilter,
  IClassroomCreateFormData,
  IClassroomSyllabusQuery,
  IClassroomUpdateFormData,
} from './classroom.interfaces';
@Injectable()
export class ClassroomService extends BaseService {
  constructor(
    protected readonly configService: ConfigService,
    private readonly repo: ClassroomRepository,
    private readonly lessonRepo: LessonRepository,
    private readonly syllabusRepo: SyllabusRepository,
    private readonly lectureRepo: LectureRepository,
    private readonly userRepo: UserRepository,
    private readonly timekeepingRepo: TimekeepingRepository,
    private readonly userCourseRepo: UserCourseRepository,
    private readonly tuitionRepo: TuitionRepository,
    private readonly courseRepo: CourseRepository,
  ) {
    super(ClassroomService.name, configService);
  }

  async create(
    dto: IClassroomCreateFormData & {
      createdBy: Types.ObjectId;
      updatedBy: Types.ObjectId;
    },
    courseInfo: { tuition: number },
  ) {
    const session = await this.repo.model.startSession();
    try {
      session.startTransaction();
      const latestClassroomOfYear = await this.repo
        .findLatestClassroomOfYear()
        .lean()
        .exec();
      const maxCode = latestClassroomOfYear?.code;
      const code = generateNextCode(CodePrefix.CLASSROOM, maxCode);
      const newClassroom = {
        ...dto,
        courseId: sto(dto.courseId),
        code,
        participantIds: stos(dto.participantIds),
        syllabusIds: stos(dto.syllabusIds),
        paymentStartDate: dto?.paymentDate.startDate,
        paymentEndDate: dto?.paymentDate.endDate,
      };
      const createdClassroom = await this.repo.create(newClassroom, {
        session,
      });

      if (dto?.participantIds?.length) {
        const userCourses = await this.userCourseRepo.model
          .find({
            userId: { $in: dto.participantIds },
            courseId: dto.courseId,
          })
          .lean()
          .exec();
        const presenterIdsMapByStudentId = Object.fromEntries(
          userCourses.map((item) => [
            item.userId.toString(),
            item.presenterId?.toString(),
          ]),
        );
        await this.tuitionRepo.CreateTuitionForStudents(
          {
            classroomId: createdClassroom._id,
            courseId: dto.courseId,
            studentIds: dto.participantIds,
            createdBy: dto.createdBy,
            updatedBy: dto.updatedBy,
            tuition: courseInfo.tuition,
            paymentStartDate: dto?.paymentDate.startDate,
            paymentEndDate: dto?.paymentDate.endDate,
            presenterIdsMapByStudentId,
          },
          session,
        );
      }
      await session.commitTransaction();
      return createdClassroom;
    } catch (error) {
      await session.abortTransaction();
      this.logger.error('Error in create service', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async findAllWithPaging(
    params: IClassFilter,
    roleType: RoleType,
    userId: string,
  ) {
    try {
      const filter: FilterQuery<Classroom> = { $and: [] };
      if (params.keyword) {
        filter.$and.push({
          $or: [
            { name: { $regex: `.*${params.keyword}.*`, $options: 'i' } },
            { code: { $regex: `.*${params.keyword}.*`, $options: 'i' } },
          ],
        });
      }
      if (params.courseIds) {
        filter.$and.push({ courseId: { $in: stos(params?.courseIds) } });
      }
      if (params.statuses?.length) {
        filter.$and.push({ status: { $in: params.statuses } });
      }
      if (roleType === RoleType.STUDENT) {
        filter.$and.push({ participantIds: sto(userId) });
      } else if (roleType === RoleType.TEACHER) {
        const lessons: Lesson[] = await this.lessonRepo
          .find({ teacher: sto(userId) }, ['classroomId'])
          .distinct('classroomId')
          .lean()
          .exec();
        const classroomIds = lessons.map((lesson) => lesson.classroomId);
        filter.$and.push({ _id: { $in: classroomIds } });
      }
      if (!filter.$and?.length) delete filter.$and;
      const orderDirection =
        params.orderDirection === OrderDirection.ASC ? 1 : -1;
      const currentDate = dayjs()
        .endOf('day')
        .format(DateFormat.YYYY_MM_DD_HYPHEN);
      const query: PipelineStage[] = [
        addFieldStatusPipeline(currentDate),
        { $match: filter },
        {
          $lookup: {
            from: MongoCollection.COURSES,
            localField: 'courseId',
            foreignField: '_id',
            as: 'course',
            pipeline: [
              { $match: DELETE_COND },
              { $limit: 1 },
              { $project: { name: 1, code: 1 } },
            ],
          },
        },
        { $unwind: { path: '$course', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            name: 1,
            createdAt: 1,
            code: 1,
            courseId: 1,
            startDate: 1,
            endDate: 1,
            participantIds: 1,
            totalStudents: { $size: '$participantIds' },
            teacherIds: 1,
            color: 1,
            syllabusIds: 1,
            status: 1,
            course: 1,
            paymentStartDate: 1,
            paymentEndDate: 1,
          },
        },
        {
          $facet: {
            data: [
              { $sort: { [params.orderBy]: orderDirection } },
              { $skip: params.skip },
              { $limit: params.limit },
            ],
            total: [{ $count: 'count' }],
          },
        },
      ];

      const data = await this.repo.model.aggregate(query).exec();
      const items = get(data, '[0].data', []);
      const totalItems = get(data, '0.total.0.count', 0);
      return { items, totalItems };
    } catch (error) {
      this.logger.error('Error in findAllWithPaging service', error);
      throw error;
    }
  }

  async getDetailInfo(id: string) {
    try {
      const query: PipelineStage[] = [
        { $match: { _id: sto(id) } },
        {
          $lookup: {
            from: MongoCollection.COURSES,
            localField: 'courseId',
            foreignField: '_id',
            as: 'course',
            pipeline: [
              { $match: DELETE_COND },
              { $limit: 1 },
              { $project: { name: 1, code: 1 } },
            ],
          },
        },
        { $unwind: { path: '$course', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: MongoCollection.USERS,
            localField: 'participantIds',
            foreignField: '_id',
            as: 'participants',
            pipeline: [
              { $match: DELETE_COND },
              { $project: { name: 1, code: 1 } },
            ],
          },
        },
        { $limit: 1 },
        {
          $project: {
            name: 1,
            code: 1,
            course: 1,
            startDate: 1,
            endDate: 1,
            participants: 1,
            color: 1,
            paymentStartDate: 1,
            paymentEndDate: 1,
          },
        },
      ];
      const detail = (await this.repo.model.aggregate(query).exec())?.[0];
      if (!detail) return null;

      const lessons = await this.lessonRepo
        .find({ classroomId: id }, ['date', 'startTime', 'endTime'])
        .lean()
        .exec();
      const totalLesson = lessons?.length || 0;
      let countFinishedLesson = 0;
      let countInProgressLesson = 0;
      lessons.forEach((lesson) => {
        const startTime = dayjs(lesson.date + ' ' + lesson.startTime);
        const endTime = dayjs(lesson.date + ' ' + lesson.endTime);
        if (startTime.isBefore() && endTime.isAfter()) {
          countInProgressLesson += 1;
        } else if (endTime.isBefore()) {
          countFinishedLesson += 1;
        }
      });
      return {
        ...detail,
        totalLesson,
        countFinishedLesson,
        countInProgressLesson,
      };
    } catch (error) {
      this.logger.error('Error in getDetailInfo service', error);
      throw error;
    }
  }

  async update(
    id: string,
    params: IClassroomUpdateFormData & { updatedBy: Types.ObjectId },
    oldClassroomInfo: {
      courseId: Types.ObjectId;
      syllabusIds: Types.ObjectId[];
      participantIds: Types.ObjectId[];
      paymentStartDate: Date;
      paymentEndDate: Date;
    },
  ) {
    const session = await this.repo.model.startSession();
    try {
      session.startTransaction();
      if (params.participantIds) {
        const oldParticipants = oldClassroomInfo.participantIds?.map((id) =>
          id.toString(),
        );
        const newParticipantIds: string[] = difference(
          params.participantIds,
          oldParticipants,
        );
        const removeParticipantIds: string[] = difference(
          oldParticipants,
          params.participantIds,
        );
        if (newParticipantIds?.length) {
          const [course, tuitions, userCourses] = await Promise.all([
            this.courseRepo
              .findById(oldClassroomInfo.courseId, { tuition: 1 })
              .lean()
              .exec(),
            this.tuitionRepo
              .find(
                { userId: { $in: newParticipantIds }, classroomId: id },
                { userId: 1 },
              )
              .lean()
              .exec(),
            this.userCourseRepo
              .find({
                userId: { $in: newParticipantIds },
                courseId: oldClassroomInfo.courseId,
              })
              .lean()
              .exec(),
          ]);
          const presenterIdsMapByStudentId = Object.fromEntries(
            userCourses.map((item) => [
              item.userId.toString(),
              item.presenterId?.toString(),
            ]),
          );
          // Check if any student in new adding student list has already had tuition
          const newStudentIdsHadTuition = tuitions?.map((tuition) =>
            tuition.userId.toString(),
          );
          const newStudentIdsHaveToInitTuition = difference(
            newParticipantIds,
            newStudentIdsHadTuition,
          );
          const paymentStartDate =
            params?.paymentDate?.startDate || oldClassroomInfo.paymentStartDate;
          const paymentEndDate =
            params?.paymentDate?.endDate || oldClassroomInfo.paymentEndDate;
          await this.tuitionRepo.CreateTuitionForStudents(
            {
              classroomId: id,
              courseId: oldClassroomInfo.courseId,
              studentIds: newStudentIdsHaveToInitTuition,
              createdBy: params.updatedBy,
              updatedBy: params.updatedBy,
              tuition: course.tuition,
              paymentStartDate: paymentStartDate,
              paymentEndDate: paymentEndDate,
              presenterIdsMapByStudentId,
            },
            session,
          );
        }

        // Removing tuition for removed students
        if (removeParticipantIds?.length) {
          await this.tuitionRepo.RemoveTuitionForStudents(
            {
              classroomId: id,
              studentIds: removeParticipantIds,
              deletedBy: params.updatedBy,
            },
            session,
          );
        }
      }
      if (params?.courseId) {
        Object.assign(params, { courseId: params?.courseId });
      }

      if (params?.syllabusIds) {
        const _syllabusIds = params.syllabusIds.map((id) => id.toString());
        const removeSyllabusIds = difference(_syllabusIds, params.syllabusIds);
        await this.lessonRepo
          .updateMany(
            { classroomId: id, syllabusIds: { $in: removeSyllabusIds } },
            { $set: { syllabusIds: null, lectureIds: null } },
            { session, lean: true },
          )
          .exec();
      }
      if (params.paymentDate) {
        Object.assign(params, {
          paymentStartDate: params.paymentDate.startDate,
          paymentEndDate: params.paymentDate.endDate,
        });
        delete params.paymentDate;
      }

      const updatedClassroom = await this.repo
        .findByIdAndUpdate(id, params, {
          new: true,
          runValidators: true,
          session,
          lean: true,
        })
        .exec();

      await session.commitTransaction();
      return updatedClassroom;
    } catch (error) {
      await session.abortTransaction();
      this.logger.error('Error in update service', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async deleteManyIds(
    ids: (Types.ObjectId | string)[],
    deletedBy: Types.ObjectId,
  ): Promise<boolean> {
    const session = await this.repo.model.startSession();
    try {
      session.startTransaction();
      await this.repo.model
        .delete({ _id: { $in: ids } }, deletedBy)
        .session(session)
        .lean()
        .exec();
      await this.tuitionRepo
        .delete({ classroomId: { $in: ids } }, deletedBy)
        .session(session)
        .lean()
        .exec();
      await session.commitTransaction();
      return true;
    } catch (error) {
      await session.abortTransaction();
      this.logger.error('Error in deleteManyIds service', error);
      return false;
    } finally {
      await session.endSession();
    }
  }

  async getClassroomSyllabusListByIds(
    ids: Types.ObjectId[],
    params: IClassroomSyllabusQuery,
  ) {
    try {
      const filter: FilterQuery<Syllabus> = { _id: { $in: ids } };
      if (params.keyword) {
        filter.name = { $regex: `.*${params.keyword}.*`, $options: 'i' };
      }
      const orderDirection =
        params.orderDirection === OrderDirection.ASC ? 1 : -1;
      const pipelines: PipelineStage[] = [
        { $match: filter },
        { $project: { name: 1, image: 1, createdAt: 1 } },
        {
          $facet: {
            data: [
              { $sort: { [params.orderBy]: orderDirection } },
              { $skip: params.skip },
              { $limit: params.limit },
            ],
            count: [{ $count: 'total' }],
          },
        },
      ];
      const [[result], countLectureBySyllabusIds] = await Promise.all([
        this.syllabusRepo.model.aggregate(pipelines).exec(),
        this.lectureRepo.model.aggregate([
          { $match: { syllabusId: { $in: ids }, deleted: false } },
          { $group: { _id: '$syllabusId', numberOfLectures: { $count: {} } } },
        ]),
      ]);
      const syllabuses = result.data || [];
      const totalSyllabuses = result?.count?.[0]?.total || 0;

      const countLectureBySyllabusIdMap = Object.fromEntries(
        countLectureBySyllabusIds.map((item) => [
          item._id.toString(),
          item.numberOfLectures,
        ]),
      );
      forEach(syllabuses, (syllabus) => {
        syllabus.numberOfLectures =
          countLectureBySyllabusIdMap[syllabus._id.toString()] || 0;
      });

      return { items: syllabuses, totalItems: totalSyllabuses };
    } catch (error) {
      this.logger.error(
        'Error in getClassroomSyllabusListByIds service',
        error,
      );
      throw error;
    }
  }

  async getTeacherTimekeeping(classroomId: string) {
    try {
      const lessons = await this.lessonRepo
        .find(
          { classroomId },
          { teacherId: 1, date: 1, endTime: 1, studentIds: 1 },
        )
        .lean()
        .exec();
      const teacherIds = uniq(lessons.map((item) => item.teacherId));
      const timekeepingObject = await this.getTimekeepingUsers(
        lessons,
        teacherIds,
        false,
      );

      const teachers = await this.userRepo
        .findByIds(teacherIds, { name: 1, code: 1 })
        .lean()
        .exec();
      forEach(teachers, (_teacher) => {
        const id = _teacher._id.toString();
        Object.assign(_teacher, { timekeeping: timekeepingObject[id] || {} });
      });
      return teachers;
    } catch (error) {
      this.logger.error('Error in getTeacherTimekeeping service', error);
      throw error;
    }
  }

  async getStudentTimekeeping(
    classroomId: string,
    studentIds: Types.ObjectId[],
  ) {
    const lessons = await this.lessonRepo
      .find(
        { classroomId },
        { teacherId: 1, date: 1, endTime: 1, studentIds: 1 },
      )
      .lean()
      .exec();

    const [timekeepingObject, students] = await Promise.all([
      this.getTimekeepingUsers(lessons, studentIds, true),
      this.userRepo.findByIds(studentIds, { name: 1, code: 1 }).lean().exec(),
    ]);
    forEach(students, (_student) => {
      const id = _student._id.toString();
      Object.assign(_student, { timekeeping: timekeepingObject[id] || {} });
    });
    return students;
  }

  async getTimekeepingUsers(
    lessons: Lesson[],
    userIds: Types.ObjectId[],
    isStudent = true,
  ) {
    const lessonIds = lessons.map((item) => item._id.toString());
    const timekeepings = await this.timekeepingRepo
      .find({ userId: { $in: userIds }, lessonId: { $in: lessonIds } })
      .lean()
      .exec();
    const timekeepingMapByUserId = Object.fromEntries(
      userIds.map((id) => [
        id.toString(),
        { total: 0, attended: 0, finishedLesson: 0 },
      ]),
    );
    forEach(lessons, (lesson) => {
      const { date, endTime } = lesson;
      const end = dayjs(date + ' ' + endTime);
      const countFinishedLesson = dayjs().isAfter(end) ? 1 : 0;
      const _userIds = isStudent ? lesson.studentIds : [lesson.teacherId];
      forEach(_userIds, (userId) => {
        const id = userId.toString();
        if (timekeepingMapByUserId[id]) {
          timekeepingMapByUserId[id].total += 1;
          timekeepingMapByUserId[id].finishedLesson += countFinishedLesson;
        }
      });
    });

    forEach(timekeepings, (item) => {
      const id = item.userId.toString();
      if (timekeepingMapByUserId[id] && item.isAttended) {
        timekeepingMapByUserId[id].attended += 1;
      }
    });

    return timekeepingMapByUserId;
  }
}
