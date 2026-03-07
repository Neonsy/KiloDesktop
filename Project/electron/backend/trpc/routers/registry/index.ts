import {
    registryListResolvedInputSchema,
    registryRefreshInputSchema,
    registrySearchSkillsInputSchema,
} from '@/app/backend/runtime/contracts';
import {
    listResolvedRegistry,
    refreshRegistry,
    searchResolvedSkillfiles,
} from '@/app/backend/runtime/services/registry/service';
import { publicProcedure, router } from '@/app/backend/trpc/init';

export const registryRouter = router({
    refresh: publicProcedure.input(registryRefreshInputSchema).mutation(async ({ input }) => {
        return refreshRegistry(input);
    }),
    listResolved: publicProcedure.input(registryListResolvedInputSchema).query(async ({ input }) => {
        return listResolvedRegistry(input);
    }),
    searchSkills: publicProcedure.input(registrySearchSkillsInputSchema).query(async ({ input }) => {
        return {
            skillfiles: await searchResolvedSkillfiles(input),
        };
    }),
});
