import { initializePersistence } from '@/app/backend/persistence/db';

import { scriptLog } from '@/scripts/logger';

const dbPath = process.env['NEONCONDUCTOR_DB_PATH'];

initializePersistence({
    ...(dbPath ? { dbPath } : {}),
    forceReinitialize: true,
});

scriptLog.info({
    tag: 'runtime-migrate',
    message: 'Runtime migrations applied successfully.',
    ...(dbPath ? { dbPath } : {}),
});
