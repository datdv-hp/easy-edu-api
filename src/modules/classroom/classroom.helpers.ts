import { ClassroomStatus } from '@/database/constants';
import { PipelineStage } from 'mongoose';

export const addFieldStatusPipeline = (now: string): PipelineStage => {
  return {
    $addFields: {
      status: {
        $cond: {
          if: { $gt: ['$startDate', now] },
          then: ClassroomStatus.COMING,
          else: {
            $cond: {
              if: { $lt: ['$endDate', now] },
              then: ClassroomStatus.FINISHED,
              else: ClassroomStatus.OPENING,
            },
          },
        },
      },
    },
  };
};
