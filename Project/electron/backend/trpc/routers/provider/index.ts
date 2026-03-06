import { router } from '@/app/backend/trpc/init';
import { providerMutationProcedures } from '@/app/backend/trpc/routers/provider/mutations';
import { providerQueryProcedures } from '@/app/backend/trpc/routers/provider/queries';

export const providerRouter = router({
    ...providerQueryProcedures,
    ...providerMutationProcedures,
});
