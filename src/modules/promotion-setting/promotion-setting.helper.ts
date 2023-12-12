import { PipelineStage } from 'mongoose';
import { PromotionStatus } from './promotion-setting.constant';

export const addStatusFieldPipelineStage = (now: Date): PipelineStage => {
  return {
    $addFields: {
      status: {
        $cond: {
          if: { $gt: ['$startAt', now] },
          then: PromotionStatus.UPCOMING,
          else: {
            $cond: {
              if: { $lt: ['$endAt', now] },
              then: PromotionStatus.EXPIRED,
              else: PromotionStatus.ONGOING,
            },
          },
        },
      },
    },
  };
};
