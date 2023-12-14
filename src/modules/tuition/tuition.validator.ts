import {
  BaseFilterSchema,
  ObjectIdSchema,
} from '@/common/validations/common.validation';
import Joi from 'src/plugins/joi';

export const FilterInfoTuitionStudentSchema = Joi.object({
  ...BaseFilterSchema,
  classroomIds: Joi.array().items(Joi.string()).unique(),
  statuses: Joi.array().items(Joi.string()).unique(),
  startAt: Joi.date().optional(),
  endAt: Joi.date().optional(),
  presenterIds: Joi.array().items(Joi.string()).unique(),
});

export const FilterTuitionPaymentHistorySchema = Joi.object(BaseFilterSchema);

export const TuitionPaymentBodySchema = Joi.object({
  paymentDate: Joi.date().required(),
  paymentMethodId: ObjectIdSchema.required(),
  value: Joi.number().greater(0).required(),
});

const TuitionPromotionInfoSchema = Joi.object({
  id: ObjectIdSchema.required(),
  priority: Joi.number().min(0).max(5).integer().required(),
});
export const UpdateTuitionInfoBodySchema = Joi.object({
  payment: Joi.object()
    .keys({
      startDate: Joi.date().required(),
      endDate: Joi.date().greater(Joi.ref('startDate')).required(),
    })
    .optional(),
  promotions: Joi.array()
    .items(TuitionPromotionInfoSchema)
    .custom((promotions, helper) => {
      const promotionIdsSet = new Set(
        promotions.map((promotion) => promotion.id),
      );
      const prioritiesSet = new Set(
        promotions.map((promotion) => promotion.priority),
      );
      if (promotionIdsSet.size !== promotions.length) {
        return helper.error('tuition.duplicatedApplyPromotion');
      }
      if (prioritiesSet.size !== promotions.length) {
        return helper.error('tuition.duplicatedPriority');
      }
      return promotions;
    })
    .optional(),
});
