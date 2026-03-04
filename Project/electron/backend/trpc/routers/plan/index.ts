import {
    planAnswerQuestionInputSchema,
    planApproveInputSchema,
    planGetActiveInputSchema,
    planGetInputSchema,
    planImplementInputSchema,
    planReviseInputSchema,
    planStartInputSchema,
} from '@/app/backend/runtime/contracts';
import { planService } from '@/app/backend/runtime/services/plan/service';
import { publicProcedure, router } from '@/app/backend/trpc/init';

export const planRouter = router({
    start: publicProcedure.input(planStartInputSchema).mutation(async ({ input }) => {
        return planService.start(input);
    }),
    get: publicProcedure.input(planGetInputSchema).query(async ({ input }) => {
        return planService.getById(input.profileId, input.planId);
    }),
    getActive: publicProcedure.input(planGetActiveInputSchema).query(async ({ input }) => {
        return planService.getActiveBySession(input);
    }),
    answerQuestion: publicProcedure.input(planAnswerQuestionInputSchema).mutation(async ({ input }) => {
        return planService.answerQuestion(input);
    }),
    revise: publicProcedure.input(planReviseInputSchema).mutation(async ({ input }) => {
        return planService.revise(input);
    }),
    approve: publicProcedure.input(planApproveInputSchema).mutation(async ({ input }) => {
        return planService.approve(input.profileId, input.planId);
    }),
    implement: publicProcedure.input(planImplementInputSchema).mutation(async ({ input }) => {
        return planService.implement(input);
    }),
});
