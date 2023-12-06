import Joi from 'joi';
import { BaseFilterSchema } from '@/common/validations';
import { RoleType } from '@/common/constants';
import {
  managerRole,
  studentRole,
  teacherRole,
} from '@/database/seeds/data/roles';
const INPUT_DESCRIPTION_MAX_LENGTH = 1000;
const [featureManagerSchema, featureTeacherSchema, featureStudentSchema] = [
  {},
  {},
  {},
];
const UserRoleTypes = [RoleType.MANAGER, RoleType.TEACHER, RoleType.STUDENT];
Object.keys(managerRole).forEach((featureGroup) => {
  const groupSchema = {};
  Object.keys(managerRole[featureGroup]).forEach((feature) => {
    if (managerRole[featureGroup][feature] === true)
      groupSchema[feature] = Joi.boolean().required();
  });
  featureManagerSchema[featureGroup] = Joi.object(groupSchema).required();
});

Object.keys(teacherRole).forEach((featureGroup) => {
  const groupSchema = {};
  Object.keys(teacherRole[featureGroup]).forEach((feature) => {
    if (teacherRole[featureGroup][feature] === true)
      groupSchema[feature] = Joi.boolean().required();
  });
  featureTeacherSchema[featureGroup] = Joi.object(groupSchema).required();
});

Object.keys(studentRole).forEach((featureGroup) => {
  const groupSchema = {};
  Object.keys(studentRole[featureGroup]).forEach((feature) => {
    if (studentRole[featureGroup][feature] === true)
      groupSchema[feature] = Joi.boolean().required();
  });
  featureStudentSchema[featureGroup] = Joi.object(groupSchema).required();
});

const name = Joi.string();
const featuresManager = Joi.object(featureManagerSchema);
const featuresTeacher = Joi.object(featureTeacherSchema);
const featuresStudent = Joi.object(featureStudentSchema);
const description = Joi.string().allow('').max(INPUT_DESCRIPTION_MAX_LENGTH);

export const roleTypeSchema = Joi.string()
  .valid(...Object.values(UserRoleTypes))
  .optional();

export const createRoleSchema = Joi.object({
  name: name.required(),
  features: Joi.when('type', [
    {
      is: RoleType.MANAGER,
      then: featuresManager.required(),
    },
    {
      is: RoleType.TEACHER,
      then: featuresTeacher.required(),
    },
    {
      is: RoleType.STUDENT,
      then: featuresStudent.required(),
      otherwise: Joi.forbidden(),
    },
  ]),
  description: description.optional(),
  type: Joi.string()
    .valid(...Object.values(RoleType))
    .required(),
});

export const updateRoleSchema = Joi.object({
  name: name.optional(),
  features: Joi.when('type', [
    {
      is: RoleType.MANAGER,
      then: featuresManager.required(),
    },
    {
      is: RoleType.TEACHER,
      then: featuresTeacher.required(),
    },
    {
      is: RoleType.STUDENT,
      then: featuresStudent.required(),
      otherwise: Joi.forbidden(),
    },
  ]),
  description: description.optional(),
  type: Joi.string()
    .valid(...Object.values(RoleType))
    .optional(),
});

export const updateUserRoleSchema = Joi.object({
  roleId: Joi.string().required(),
});

export const roleFilterSchema = Joi.object({
  ...BaseFilterSchema,
  name: name.optional(),
});
