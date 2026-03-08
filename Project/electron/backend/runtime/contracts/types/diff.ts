import type { DiffFileArtifact } from '@/app/backend/persistence/types';
import type { EntityId } from '@/app/backend/runtime/contracts/ids';
import type { ProfileInput } from '@/app/backend/runtime/contracts/types/common';

export interface DiffListByRunInput extends ProfileInput {
    runId: EntityId<'run'>;
}

export interface DiffGetFilePatchInput extends ProfileInput {
    diffId: string;
    path: string;
}

export interface DiffStatusCounts {
    added: number;
    modified: number;
    deleted: number;
    renamed: number;
    copied: number;
    type_changed: number;
    untracked: number;
}

export interface DiffDirectoryOverview {
    directory: string;
    fileCount: number;
    addedLines?: number;
    deletedLines?: number;
}

export interface DiffHighlightedFileOverview {
    path: string;
    status: DiffFileArtifact['status'];
    addedLines?: number;
    deletedLines?: number;
}

export type DiffOverview =
    | {
          kind: 'git';
          fileCount: number;
          summary: string;
          totalAddedLines?: number;
          totalDeletedLines?: number;
          statusCounts: DiffStatusCounts;
          topDirectories: DiffDirectoryOverview[];
          highlightedFiles: DiffHighlightedFileOverview[];
      }
    | {
          kind: 'unsupported';
          summary: string;
          reason: 'workspace_not_git' | 'git_unavailable' | 'workspace_unresolved' | 'capture_failed';
          detail: string;
      };
