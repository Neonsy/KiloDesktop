import { trpc } from '@/web/trpc/client';

export function useRuntimeSnapshot(profileId: string) {
    return trpc.runtime.getSnapshot.useQuery(
        { profileId },
        {
            refetchOnWindowFocus: false,
        }
    );
}
