import type { ReactNode } from 'react';

export interface WorkspaceStripChip {
    id: string;
    label: string;
    detail: string;
    selected: boolean;
}

export interface WorkspaceInspectorSection {
    id: string;
    label: string;
    description: string;
    content: ReactNode;
    badge?: string;
    tone?: 'default' | 'attention';
}
