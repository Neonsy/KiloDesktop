import { getPersistence } from '@/app/backend/persistence/db';

export type ProfileStoreDb = ReturnType<typeof getPersistence>['db'];
