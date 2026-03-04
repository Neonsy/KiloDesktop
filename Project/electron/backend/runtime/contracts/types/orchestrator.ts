import type { OrchestratorRunStatus, RuntimeProviderId } from '@/app/backend/runtime/contracts/enums';
import type { EntityId } from '@/app/backend/runtime/contracts/ids';
import type { ProfileInput } from '@/app/backend/runtime/contracts/types/common';
import type { RuntimeRunOptions } from '@/app/backend/runtime/contracts/types/session';

export interface OrchestratorStartInput extends ProfileInput {
    planId: EntityId<'plan'>;
    runtimeOptions: RuntimeRunOptions;
    providerId?: RuntimeProviderId;
    modelId?: string;
    workspaceFingerprint?: string;
}

export interface OrchestratorRunByIdInput extends ProfileInput {
    orchestratorRunId: EntityId<'orch'>;
}

export interface OrchestratorRunBySessionInput extends ProfileInput {
    sessionId: EntityId<'sess'>;
}

export interface OrchestratorStepView {
    id: EntityId<'step'>;
    sequence: number;
    description: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'aborted';
    runId?: EntityId<'run'>;
    errorMessage?: string;
    createdAt: string;
    updatedAt: string;
}

export interface OrchestratorRunView {
    id: EntityId<'orch'>;
    profileId: string;
    sessionId: EntityId<'sess'>;
    planId: EntityId<'plan'>;
    status: OrchestratorRunStatus;
    activeStepIndex?: number;
    startedAt: string;
    completedAt?: string;
    abortedAt?: string;
    errorMessage?: string;
    createdAt: string;
    updatedAt: string;
    steps: OrchestratorStepView[];
}
