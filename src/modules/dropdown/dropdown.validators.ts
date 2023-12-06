import { ObjectIdSchema } from '@/common/validations';
import Joi from '@/plugins/joi';

export const CourseDropdownSchema = Joi.object({
  classRoomId: ObjectIdSchema.optional(),
});
export const SubjectDropdownSchema = Joi.object().keys({
  courseId: ObjectIdSchema.optional(),
  classroomId: ObjectIdSchema.optional(),
});

export const ClassDropdownFilterSchema = Joi.object({
  courseId: ObjectIdSchema.optional(),
});
