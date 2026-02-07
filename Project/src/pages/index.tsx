import {
    VscArchive,
    VscBell,
    VscBook,
    VscBrowser,
    VscChecklist,
    VscChevronDown,
    VscChromeClose,
    VscCloud,
    VscCode,
    VscDebug,
    VscDesktopDownload,
    VscEllipsis,
    VscExtensions,
    VscFolder,
    VscInfo,
    VscLayers,
    VscLayoutSidebarLeft,
    VscListSelection,
    VscLock,
    VscPulse,
    VscSearch,
    VscShield,
    VscSymbolEvent,
    VscTerminal,
} from 'react-icons/vsc';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { FilePreviewCode, MarkdownRenderer } from '@/web/pages/markdownRenderer';
import { defaultScenarioId, scenarios } from '@/web/pages/scenarioData';

import type { CSSProperties, MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import type {
    AppMode,
    ExecutionEnvironment,
    InspectableItem,
    ItemStatus,
    ScenarioData,
    SubtaskStatus,
    WorkspacePreset,
} from '@/web/pages/scenarioData';

const STORAGE_KEYS = {
    scenario: 'kilodesktop.ui.scenario',
    workspace: 'kilodesktop.ui.workspace',
    kilocodeMode: 'kilodesktop.ui.kilocodeMode',
};

type ResponsiveMode = 'wide' | 'medium' | 'narrow';
type WorkbenchTab =
    | 'diffs'
    | 'terminal'
    | 'problems'
    | 'files'
    | 'context'
    | 'browser'
    | 'providers'
    | 'agents'
    | 'specs';
type ReasoningEffort = 'Low' | 'Medium' | 'High' | 'Extreme';
type SandboxAction = 'create' | 'rebuild' | 'reset';
type AssistantSurfaceMode = 'task' | 'plan';
type ActivityKind = 'tool' | 'thinking' | 'response' | 'policy' | 'error';
type ResizeTarget = 'left' | 'side' | 'footer';

interface DiffEntry {
    id: string;
    folder: string;
    path: string;
    adds: number;
    removes: number;
    hunks: Array<{ kind: 'add' | 'remove' | 'context'; text: string }>;
}

interface TimelineEvent {
    id: string;
    text: string;
}

interface TimelineMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    text: string;
    fileRefs?: Array<{ label: string; inspectableId: string }>;
}

interface GlanceState {
    item: InspectableItem;
    x: number;
    y: number;
}

interface SandboxProgress {
    action: SandboxAction;
    progress: number;
    active: boolean;
}

interface SelectableElement {
    id: string;
    label: string;
    source: string;
}

interface WorkspaceOption {
    name: string;
    path: string;
    description: string;
}

interface ActivityEntry {
    id: string;
    kind: ActivityKind;
    label: string;
    detail: string;
}

interface ResizeState {
    target: ResizeTarget;
    startPoint: number;
    startSize: number;
}

interface ThreadGroup {
    workspace: string;
    workspacePath: string;
    environment: ExecutionEnvironment;
    threads: string[];
}

const workspaceOptions: WorkspaceOption[] = [
    {
        name: 'kmp',
        path: 'M:/Neonsy/Projects/KiloDesktop/Project',
        description: 'Primary product workspace',
    },
    {
        name: 'atlas',
        path: 'M:/Neonsy/Projects/Atlas',
        description: 'Provider and API experiments',
    },
    {
        name: 'nova',
        path: 'M:/Neonsy/Projects/Nova',
        description: 'Sandbox automation lab',
    },
];

const threadGroups: ThreadGroup[] = [
    {
        workspace: 'kmp',
        workspacePath: 'M:/Neonsy/Projects/KiloDesktop/Project',
        environment: 'local',
        threads: ['Explain parser changes', 'Sandbox setup walkthrough', 'Orchestrator UX pass'],
    },
    {
        workspace: 'atlas',
        workspacePath: 'M:/Neonsy/Projects/Atlas',
        environment: 'cloud',
        threads: ['API spec matcher draft', 'Provider router tuning'],
    },
    {
        workspace: 'nova',
        workspacePath: 'M:/Neonsy/Projects/Nova',
        environment: 'sandbox',
        threads: ['Agent farm benchmark', 'Parallel worker diagnostics'],
    },
];

const threadTags = [
    { label: 'Bugfix', count: 4, tone: 'danger' },
    { label: 'Design', count: 6, tone: 'accent' },
    { label: 'Infra', count: 3, tone: 'neutral' },
    { label: 'Policy', count: 5, tone: 'warning' },
    { label: 'Spec', count: 2, tone: 'success' },
    { label: 'Providers', count: 7, tone: 'accent' },
];

const workbenchTabs: Array<{ id: WorkbenchTab; label: string; icon: ReactNode }> = [
    { id: 'diffs', label: 'Diffs', icon: <VscSymbolEvent /> },
    { id: 'terminal', label: 'Terminal', icon: <VscTerminal /> },
    { id: 'problems', label: 'Problems', icon: <VscBell /> },
    { id: 'files', label: 'Files', icon: <VscFolder /> },
    { id: 'context', label: 'Context', icon: <VscListSelection /> },
    { id: 'browser', label: 'Browser', icon: <VscBrowser /> },
    { id: 'providers', label: 'Providers', icon: <VscExtensions /> },
    { id: 'agents', label: 'Agents', icon: <VscLayers /> },
    { id: 'specs', label: 'Specs', icon: <VscBook /> },
];

const browserElements: SelectableElement[] = [
    { id: 'el-1', label: 'Primary Button', source: 'src/components/Button.tsx:42' },
    { id: 'el-2', label: 'Top Navigation Link', source: 'src/components/NavBar.tsx:27' },
    { id: 'el-3', label: 'Search Input', source: 'src/components/SearchBar.tsx:61' },
    { id: 'el-4', label: 'Pricing Card', source: 'src/features/pricing/Card.tsx:18' },
];

const whitelistExamples = ['.env', '.env.*', 'config/local.json'];

const providerProfiles = ['Kilo Core', 'OpenAI', 'Anthropic'];
const operatorProfiles = ['Neon', 'Reviewer Bot', 'Pair Designer'];

const diffEntries: DiffEntry[] = [
    {
        id: 'diff-1',
        folder: 'src/pages',
        path: 'src/pages/index.tsx',
        adds: 64,
        removes: 21,
        hunks: [
            { kind: 'context', text: '@@ layout @@' },
            { kind: 'remove', text: '- <WorkbenchFloatingOverlay />' },
            { kind: 'add', text: '+ <WorkbenchFooterPanel />' },
            { kind: 'add', text: '+ <ComposerRuntimeStrip />' },
            { kind: 'context', text: '@@ mode controls @@' },
            { kind: 'remove', text: "- type KilocodeMode = 'Fast' | 'Balanced' | 'Deep'" },
            { kind: 'add', text: "+ type ReasoningEffort = 'Low' | 'Medium' | 'High' | 'Extreme'" },
        ],
    },
    {
        id: 'diff-2',
        folder: 'src/pages',
        path: 'src/pages/scenarioData.ts',
        adds: 8,
        removes: 7,
        hunks: [
            { kind: 'context', text: '@@ scenario payload @@' },
            { kind: 'remove', text: "- kilocodeMode: 'Balanced'" },
            { kind: 'add', text: "+ reasoningEffort: 'Medium'" },
            { kind: 'remove', text: "- kilocodeMode: 'Deep'" },
            { kind: 'add', text: "+ reasoningEffort: 'High'" },
        ],
    },
    {
        id: 'diff-3',
        folder: 'src/styles',
        path: 'src/styles/index.css',
        adds: 132,
        removes: 44,
        hunks: [
            { kind: 'context', text: '@@ contrast + scale @@' },
            { kind: 'add', text: '+ html { font-size: clamp(14px, 0.35vw + 11px, 20px); }' },
            { kind: 'add', text: '+ .workbench-footer { border-top: 1px solid var(--line-soft); }' },
            { kind: 'remove', text: '- .workbench-floating { position: absolute; }' },
        ],
    },
];

const assistantFallbackPlan = [
    {
        id: 'assistant-fallback-1',
        title: 'Collect user intent + constraints',
        owner: 'Assistant',
        status: 'complete' as const,
    },
    {
        id: 'assistant-fallback-2',
        title: 'Match API spec + provider capabilities',
        owner: 'Spec Matcher',
        status: 'active' as const,
    },
    {
        id: 'assistant-fallback-3',
        title: 'Execute single focused task',
        owner: 'Task Agent',
        status: 'active' as const,
    },
    {
        id: 'assistant-fallback-4',
        title: 'Return diff / terminal / file report',
        owner: 'Workbench',
        status: 'pending' as const,
    },
];

const orchestratorFallbackPlan = [
    { id: 'orchestrator-fallback-1', title: 'Collect constraints', owner: 'Planner', status: 'complete' as const },
    { id: 'orchestrator-fallback-2', title: 'Split work into subtasks', owner: 'Planner', status: 'active' as const },
    { id: 'orchestrator-fallback-3', title: 'Run parallel agents', owner: 'Orchestrator', status: 'active' as const },
    { id: 'orchestrator-fallback-4', title: 'Merge artifacts + review', owner: 'Reviewer', status: 'pending' as const },
];

const orchestratorFallbackSubtasks = [
    {
        id: 'orchestrator-subtask-1',
        title: 'Analyze repo + constraints',
        owner: 'Planner',
        status: 'done' as const,
        lastUpdate: '3m ago',
        artifacts: 3,
        inspectableId: 'cap:providers',
    },
    {
        id: 'orchestrator-subtask-2',
        title: 'Run spec + provider checks',
        owner: 'Spec Matcher',
        status: 'running' as const,
        lastUpdate: 'just now',
        artifacts: 2,
        inspectableId: 'cap:specs',
    },
    {
        id: 'orchestrator-subtask-3',
        title: 'Prepare diff + terminal report',
        owner: 'Builder',
        status: 'queued' as const,
        lastUpdate: 'queued',
        artifacts: 0,
        inspectableId: 'cap:providers',
    },
];

const orchestratorFallbackArtifacts = [
    { id: 'artifact-fallback-plan', label: 'plan.md', type: 'report' as const },
    { id: 'artifact-fallback-diff', label: 'ui-shell.diff', type: 'diff' as const },
    { id: 'artifact-fallback-log', label: 'run.log', type: 'log' as const },
];

const managerCapabilityInspectables: Record<string, InspectableItem> = {
    'cap:lsp': {
        id: 'cap:lsp',
        type: 'policy',
        title: 'Headless LSP',
        status: 'ok',
        lastUpdate: '1m ago',
        artifactCount: 4,
        summary: 'Index + diagnostics stream exposed as renderer fixtures.',
        details: ['Type graph loaded for 3 workspaces.', 'Problems panel consumes deterministic diagnostics feed.'],
    },
    'cap:providers': {
        id: 'cap:providers',
        type: 'policy',
        title: 'Custom Providers',
        status: 'running',
        lastUpdate: 'just now',
        artifactCount: 6,
        summary: 'Provider router can target Kilo, OpenAI, and Anthropic profiles.',
        details: [
            'Latency and token budgets are mocked by provider.',
            'Routing policies are editable in Workbench > Providers.',
        ],
    },
    'cap:specs': {
        id: 'cap:specs',
        type: 'policy',
        title: 'API Spec Matching',
        status: 'warning',
        lastUpdate: '2m ago',
        artifactCount: 3,
        summary: 'Spec mismatch found for one endpoint schema.',
        details: [
            'One payload field is optional in code but required in OpenAPI.',
            'Workbench > Specs contains the simulated report.',
        ],
        filePreview: {
            path: 'specs/openapi.match.log',
            language: 'json',
            content: `{
  "endpoint": "POST /sessions",
  "status": "warning",
  "issue": "missing required field: executionEnvironment"
}`,
        },
    },
    'cap:farm': {
        id: 'cap:farm',
        type: 'subtask',
        title: 'Agent Farm',
        status: 'running',
        lastUpdate: 'just now',
        artifactCount: 8,
        summary: 'Parallel workers communicate through a shared event bus (mock).',
        details: [
            '6 workers online: planner, coder, reviewer, spec, terminal, merge.',
            'Cross-agent messages shown in Workbench > Agents.',
        ],
    },
    'cap:marketplace': {
        id: 'cap:marketplace',
        type: 'policy',
        title: 'Kilo Marketplace Binding',
        status: 'ok',
        lastUpdate: '3m ago',
        artifactCount: 2,
        summary: 'Marketplace packages are listed as installable capability cards.',
        details: [
            'No backend install flow yet; renderer-only catalog fixtures.',
            'Store icon opens placeholder panel in final app design.',
        ],
    },
};

function toSentenceCase(value: string): string {
    if (!value.length) {
        return value;
    }
    return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function executionEnvironmentLabel(environment: ExecutionEnvironment): string {
    if (environment === 'sandbox') {
        return 'Worktree';
    }
    return toSentenceCase(environment);
}

function statusClass(status: ItemStatus | SubtaskStatus): string {
    if (status === 'ok' || status === 'done') {
        return 'status-dot status-ok';
    }
    if (status === 'warning' || status === 'blocked') {
        return 'status-dot status-warning';
    }
    if (status === 'running') {
        return 'status-dot status-running';
    }
    if (status === 'error') {
        return 'status-dot status-error';
    }
    return 'status-dot status-idle';
}

function planStatusLabel(status: 'pending' | 'active' | 'complete'): string {
    if (status === 'complete') {
        return 'Complete';
    }
    if (status === 'active') {
        return 'Active';
    }
    return 'Pending';
}

function activityKindClass(kind: ActivityKind): string {
    if (kind === 'thinking') {
        return 'activity-kind thinking';
    }
    if (kind === 'response') {
        return 'activity-kind response';
    }
    if (kind === 'policy') {
        return 'activity-kind policy';
    }
    if (kind === 'error') {
        return 'activity-kind error';
    }
    return 'activity-kind tool';
}

function classifyActivityFromText(text: string): ActivityKind {
    const normalized = text.toLowerCase();
    if (normalized.includes('error') || normalized.includes('failed') || normalized.includes('blocked')) {
        return 'error';
    }
    if (normalized.includes('policy') || normalized.includes('safety')) {
        return 'policy';
    }
    if (normalized.includes('thinking') || normalized.includes('plan') || normalized.includes('subtask')) {
        return 'thinking';
    }
    if (
        normalized.includes('environment') ||
        normalized.includes('workspace') ||
        normalized.includes('sandbox') ||
        normalized.includes('session')
    ) {
        return 'tool';
    }
    return 'response';
}

function isAgentTimelineEntry(text: string): boolean {
    const normalized = text.trim().toLowerCase();
    if (!normalized.length) {
        return false;
    }

    return !(
        normalized.startsWith('environment switched:') ||
        normalized.startsWith('workspace switched:') ||
        normalized.includes('sandbox preview updated') ||
        normalized.includes('cloud session started')
    );
}

function getViewportMode(width: number): ResponsiveMode {
    if (width >= 1280) {
        return 'wide';
    }
    if (width >= 960) {
        return 'medium';
    }
    return 'narrow';
}

function getScenarioById(id: string): ScenarioData {
    const fallback = scenarios[0];
    if (!fallback) {
        throw new Error('No scenarios configured.');
    }

    return scenarios.find((entry) => entry.id === id) ?? fallback;
}

function safeScenarioId(): string {
    if (typeof window === 'undefined') {
        return defaultScenarioId;
    }

    const stored = window.localStorage.getItem(STORAGE_KEYS.scenario);
    if (!stored) {
        return defaultScenarioId;
    }
    return getScenarioById(stored).id;
}

function safeReasoningEffort(): ReasoningEffort | null {
    if (typeof window === 'undefined') {
        return null;
    }

    const stored = window.localStorage.getItem(STORAGE_KEYS.kilocodeMode);
    if (stored === 'Low' || stored === 'Medium' || stored === 'High' || stored === 'Extreme') {
        return stored;
    }
    if (stored === 'Fast') {
        return 'Low';
    }
    if (stored === 'Balanced') {
        return 'Medium';
    }
    if (stored === 'Deep') {
        return 'High';
    }

    return null;
}

function safeWorkspace(): WorkspacePreset | null {
    if (typeof window === 'undefined') {
        return null;
    }

    const stored = window.localStorage.getItem(STORAGE_KEYS.workspace);
    if (!stored) {
        return null;
    }

    try {
        const parsed = JSON.parse(stored) as {
            name?: unknown;
            path?: unknown;
            environment?: unknown;
            cloudConnected?: unknown;
            sandbox?: {
                exclusions?: unknown;
                whitelistPatterns?: unknown;
                respectGitignore?: unknown;
                respectKilocodeignore?: unknown;
                preview?: {
                    copied?: unknown;
                    skipped?: unknown;
                    includedByException?: unknown;
                };
            };
        };
        if (
            typeof parsed.name !== 'string' ||
            typeof parsed.path !== 'string' ||
            (parsed.environment !== 'local' && parsed.environment !== 'sandbox' && parsed.environment !== 'cloud')
        ) {
            return null;
        }

        if (!parsed.sandbox) {
            return null;
        }

        if (!Array.isArray(parsed.sandbox.exclusions) || !Array.isArray(parsed.sandbox.whitelistPatterns)) {
            return null;
        }

        return parsed as WorkspacePreset;
    } catch {
        return null;
    }
}

export default function HomePage() {
    const [scenarioId, setScenarioId] = useState<string>(() => safeScenarioId());
    const scenario = getScenarioById(scenarioId);

    const [appMode, setAppMode] = useState<AppMode>(scenario.defaultMode);
    const [assistantSurfaceMode, setAssistantSurfaceMode] = useState<AssistantSurfaceMode>('task');
    const [reasoningEffort, setReasoningEffort] = useState<ReasoningEffort>(
        () => safeReasoningEffort() ?? scenario.reasoningEffort
    );
    const [providerProfile, setProviderProfile] = useState(providerProfiles[0] ?? 'Kilo Core');
    const [operatorProfile, setOperatorProfile] = useState(operatorProfiles[0] ?? 'Neon');
    const [workspace, setWorkspace] = useState<WorkspacePreset>(() => safeWorkspace() ?? scenario.workspacePreset);

    const [timelineMessages, setTimelineMessages] = useState<TimelineMessage[]>(scenario.timeline);
    const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>(
        scenario.initialEvents.map((text, index) => ({ id: `event-${String(index)}`, text }))
    );

    const [leftRailOpen, setLeftRailOpen] = useState(true);
    const [peekId, setPeekId] = useState<string | null>(null);
    const [pinnedPeekIds, setPinnedPeekIds] = useState<string[]>([]);
    const [glance, setGlance] = useState<GlanceState | null>(null);

    const [workspaceSheetOpen, setWorkspaceSheetOpen] = useState(false);
    const [workbenchOpen, setWorkbenchOpen] = useState(false);
    const [workbenchTab, setWorkbenchTab] = useState<WorkbenchTab>('diffs');
    const [browserInspectEnabled, setBrowserInspectEnabled] = useState(false);
    const [selectedDiffId, setSelectedDiffId] = useState(diffEntries[0]?.id ?? '');
    const [activityDetailsOpen, setActivityDetailsOpen] = useState(false);
    const [surfacePanelOpen, setSurfacePanelOpen] = useState(false);

    const [composerText, setComposerText] = useState('');
    const [composerSelections, setComposerSelections] = useState<string[]>([]);

    const [sandboxPatternInput, setSandboxPatternInput] = useState('');
    const [sandboxProgress, setSandboxProgress] = useState<SandboxProgress | null>(null);
    const [leftRailWidth, setLeftRailWidth] = useState(320);
    const [sideWorkbenchWidth, setSideWorkbenchWidth] = useState(420);
    const [footerWorkbenchHeight, setFooterWorkbenchHeight] = useState(228);

    const [viewportWidth, setViewportWidth] = useState<number>(() =>
        typeof window === 'undefined' ? 1280 : window.innerWidth
    );
    const viewportMode = getViewportMode(viewportWidth);

    const scenarioProgressRef = useRef('');
    const resizeStateRef = useRef<ResizeState | null>(null);

    const inspectables = {
        ...managerCapabilityInspectables,
        ...scenario.inspectables,
    };
    const activePeekItem = peekId ? inspectables[peekId] : null;
    const selectedDiffEntry = diffEntries.find((entry) => entry.id === selectedDiffId) ?? diffEntries[0];
    const assistantPlan = scenario.plan.length ? scenario.plan : assistantFallbackPlan;
    const orchestratorPlan = scenario.plan.length ? scenario.plan : orchestratorFallbackPlan;
    const orchestratorSubtasks = scenario.subtasks.length ? scenario.subtasks : orchestratorFallbackSubtasks;
    const orchestratorArtifacts = scenario.artifacts.length ? scenario.artifacts : orchestratorFallbackArtifacts;
    const runningSubtasks = orchestratorSubtasks.filter((task) => task.status === 'running').length;

    const activityFeed: ActivityEntry[] = [
        ...timelineEvents
            .filter((event) => isAgentTimelineEntry(event.text))
            .map((event, index) => ({
                id: `activity-event-${String(index)}`,
                kind: classifyActivityFromText(event.text),
                label: event.text,
                detail: 'Event',
            })),
        ...timelineMessages
            .filter((message) => message.role !== 'system' || isAgentTimelineEntry(message.text))
            .map((message, index) => {
                const kind: ActivityKind =
                    message.role === 'assistant'
                        ? 'response'
                        : message.role === 'system'
                          ? classifyActivityFromText(message.text)
                          : 'tool';
                return {
                    id: `activity-msg-${String(index)}`,
                    kind,
                    label:
                        message.role === 'assistant'
                            ? 'Assistant response'
                            : message.role === 'system'
                              ? 'System update'
                              : 'User request',
                    detail: message.text.slice(0, 90),
                };
            }),
    ].slice(-14);

    const activityCounts = {
        tool: activityFeed.filter((item) => item.kind === 'tool').length,
        thinking: activityFeed.filter((item) => item.kind === 'thinking').length,
        response: activityFeed.filter((item) => item.kind === 'response').length,
        policy: activityFeed.filter((item) => item.kind === 'policy').length,
        error: activityFeed.filter((item) => item.kind === 'error').length,
    };
    const activitySequence = activityFeed.slice(-20);
    const latestActivity = activitySequence[activitySequence.length - 1];
    const activityColumns = activitySequence.slice(-12).map((item, index) => {
        const baseHeight: Record<ActivityKind, number> = {
            tool: 0.34,
            thinking: 0.62,
            response: 0.5,
            policy: 0.46,
            error: 0.72,
        };
        const lift = (index % 3) * 0.1;
        return {
            id: item.id,
            kind: item.kind,
            height: Math.min(0.94, baseHeight[item.kind] + lift),
            label: item.label,
            detail: item.detail,
        };
    });
    const activityCompletion = Math.max(12, Math.min(100, Math.round((activitySequence.length / 20) * 100)));
    const activityTokenMetric = `${(10 + activitySequence.length * 0.48).toFixed(1)}k`;
    const activityContextMetric = `${(160 + activityCounts.thinking * 9).toFixed(1)}k`;
    const activityDeltaAdds = diffEntries.reduce((sum, entry) => sum + entry.adds, 0);
    const activityDeltaRemoves = diffEntries.reduce((sum, entry) => sum + entry.removes, 0);
    const activityCostMetric = `$${(0.004 + activitySequence.length * 0.0004).toFixed(3)}`;
    const liveRuntimeLabel = sandboxProgress?.active
        ? `Worktree ${sandboxProgress.action}: ${String(sandboxProgress.progress)}%`
        : appMode === 'orchestrator' && runningSubtasks > 0
          ? `Thinking: ${String(runningSubtasks)} subtasks active`
          : 'Runtime idle';

    useEffect(() => {
        const handleResize = () => {
            setViewportWidth(window.innerWidth);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const handlePointerMove = (event: MouseEvent) => {
            const state = resizeStateRef.current;
            if (!state) {
                return;
            }

            if (state.target === 'left') {
                const next = state.startSize + (event.clientX - state.startPoint);
                setLeftRailWidth(Math.min(520, Math.max(240, next)));
                return;
            }

            if (state.target === 'side') {
                const next = state.startSize + (state.startPoint - event.clientX);
                setSideWorkbenchWidth(Math.min(760, Math.max(280, next)));
                return;
            }

            const next = state.startSize + (state.startPoint - event.clientY);
            setFooterWorkbenchHeight(Math.min(480, Math.max(170, next)));
        };

        const handlePointerUp = () => {
            resizeStateRef.current = null;
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
        };

        window.addEventListener('mousemove', handlePointerMove);
        window.addEventListener('mouseup', handlePointerUp);
        return () => {
            window.removeEventListener('mousemove', handlePointerMove);
            window.removeEventListener('mouseup', handlePointerUp);
        };
    }, []);

    useEffect(() => {
        if (viewportMode === 'wide') {
            setLeftRailOpen(true);
        } else if (viewportMode === 'narrow') {
            setLeftRailOpen(false);
            setSurfacePanelOpen(false);
        }
    }, [viewportMode]);

    useEffect(() => {
        window.localStorage.setItem(STORAGE_KEYS.scenario, scenarioId);
    }, [scenarioId]);

    useEffect(() => {
        window.localStorage.setItem(STORAGE_KEYS.kilocodeMode, reasoningEffort);
    }, [reasoningEffort]);

    useEffect(() => {
        window.localStorage.setItem(STORAGE_KEYS.workspace, JSON.stringify(workspace));
    }, [workspace]);

    useEffect(() => {
        setAppMode(scenario.defaultMode);
        setAssistantSurfaceMode('task');
        setReasoningEffort(scenario.reasoningEffort);
        setWorkspace(scenario.workspacePreset);
        setTimelineMessages(scenario.timeline);
        setTimelineEvents(scenario.initialEvents.map((text, index) => ({ id: `event-${String(index)}`, text })));

        setPeekId(null);
        setPinnedPeekIds([]);
        setGlance(null);
        setLeftRailOpen(true);
        setWorkspaceSheetOpen(false);
        setWorkbenchOpen(false);
        setWorkbenchTab('diffs');
        setBrowserInspectEnabled(false);
        setSelectedDiffId(diffEntries[0]?.id ?? '');
        setActivityDetailsOpen(false);
        setSurfacePanelOpen(false);
        setComposerText('');
        setComposerSelections([]);
        setSandboxPatternInput('');
        setSandboxProgress(null);
    }, [scenario]);

    useEffect(() => {
        if (appMode === 'chat') {
            setSurfacePanelOpen(false);
        }
    }, [appMode]);

    const changeEnvironment = (nextEnvironment: ExecutionEnvironment) => {
        setWorkspace((prev) => {
            if (prev.environment === nextEnvironment) {
                return prev;
            }

            return {
                ...prev,
                environment: nextEnvironment,
                cloudConnected: nextEnvironment === 'cloud' ? prev.cloudConnected : false,
            };
        });
    };

    const switchWorkspace = (workspaceName: string) => {
        const option = workspaceOptions.find((entry) => entry.name === workspaceName);
        if (!option) {
            return;
        }

        setWorkspace((prev) => ({
            ...prev,
            name: option.name,
            path: option.path,
        }));
    };

    const runSandboxAction = (action: SandboxAction) => {
        let progress = 0;
        setSandboxProgress({ action, progress: 0, active: true });

        const intervalId = window.setInterval(() => {
            progress += action === 'create' ? 20 : action === 'rebuild' ? 25 : 40;
            const clamped = progress >= 100 ? 100 : progress;
            setSandboxProgress({ action, progress: clamped, active: clamped < 100 });

            if (clamped < 100) {
                return;
            }

            window.clearInterval(intervalId);

            if (action === 'reset') {
                setWorkspace((prev) => ({
                    ...prev,
                    sandbox: {
                        ...prev.sandbox,
                        preview: {
                            copied: 0,
                            skipped: 0,
                            includedByException: 0,
                        },
                    },
                }));
            }

            window.setTimeout(() => setSandboxProgress(null), 600);
        }, 150);
    };

    useEffect(() => {
        if (scenario.id !== 'assistant_sandbox_setup') {
            return;
        }

        const token = `${scenario.id}:create`;
        if (scenarioProgressRef.current === token) {
            return;
        }
        scenarioProgressRef.current = token;

        const timeoutId = window.setTimeout(() => runSandboxAction('create'), 280);
        return () => window.clearTimeout(timeoutId);
    }, [scenario.id]);

    const previewSandbox = () => {
        setWorkspace((prev) => {
            const copied = 108 + prev.sandbox.whitelistPatterns.length * 6;
            const skipped = 276 + prev.sandbox.exclusions.length * 11;
            const includedByException = prev.sandbox.whitelistPatterns.length;

            return {
                ...prev,
                sandbox: {
                    ...prev.sandbox,
                    preview: {
                        copied,
                        skipped,
                        includedByException,
                    },
                },
            };
        });
    };

    const addWhitelistPattern = () => {
        const pattern = sandboxPatternInput.trim();
        if (!pattern) {
            return;
        }

        setWorkspace((prev) => {
            if (prev.sandbox.whitelistPatterns.includes(pattern)) {
                return prev;
            }
            return {
                ...prev,
                sandbox: {
                    ...prev.sandbox,
                    whitelistPatterns: [...prev.sandbox.whitelistPatterns, pattern],
                },
            };
        });

        setSandboxPatternInput('');
    };

    const removeWhitelistPattern = (pattern: string) => {
        setWorkspace((prev) => ({
            ...prev,
            sandbox: {
                ...prev.sandbox,
                whitelistPatterns: prev.sandbox.whitelistPatterns.filter((entry) => entry !== pattern),
            },
        }));
    };

    const openCloudSession = () => {
        setWorkspace((prev) => ({ ...prev, cloudConnected: true }));
    };

    const showGlance = (inspectableId: string, event: ReactMouseEvent<HTMLElement>) => {
        const item = inspectables[inspectableId];
        if (!item) {
            return;
        }

        const rect = event.currentTarget.getBoundingClientRect();
        const candidateX = rect.right + 12;
        const x = candidateX > window.innerWidth - 312 ? rect.left - 296 : candidateX;

        setGlance({
            item,
            x: Math.max(12, x),
            y: Math.max(12, rect.top),
        });
    };

    const hideGlance = (inspectableId: string) => {
        setGlance((prev) => {
            if (!prev || prev.item.id !== inspectableId) {
                return prev;
            }
            return null;
        });
    };

    const openPeek = (inspectableId: string) => {
        setPeekId(inspectableId);
        if (viewportMode === 'narrow') {
            setLeftRailOpen(false);
        }
    };

    const interactions = (inspectableId: string) => ({
        onMouseEnter: (event: ReactMouseEvent<HTMLElement>) => showGlance(inspectableId, event),
        onMouseLeave: () => hideGlance(inspectableId),
        onClick: () => openPeek(inspectableId),
    });

    const togglePin = (inspectableId: string) => {
        setPinnedPeekIds((prev) => {
            if (prev.includes(inspectableId)) {
                return prev.filter((entry) => entry !== inspectableId);
            }
            return [...prev, inspectableId];
        });
    };

    const submitComposer = () => {
        const text = composerText.trim();
        if (!text) {
            return;
        }

        setTimelineMessages((prev) => [
            ...prev,
            { id: `user-${String(Date.now())}`, role: 'user', text },
            {
                id: `assistant-${String(Date.now())}`,
                role: 'assistant',
                text:
                    appMode === 'orchestrator'
                        ? 'Acknowledged. Request scheduled across parallel sub-agents in the orchestrator lane.'
                        : 'Acknowledged. Assistant queued a single-task run with provider and spec checks.',
            },
        ]);
        setComposerText('');
    };

    const addElementToComposer = (source: string) => {
        const chip = `Selected element -> ${source}`;
        setComposerSelections((prev) => (prev.includes(chip) ? prev : [...prev, chip]));
    };

    const removeSelectionChip = (chip: string) => {
        setComposerSelections((prev) => prev.filter((entry) => entry !== chip));
    };

    const leftRailVisible = leftRailOpen && viewportMode !== 'narrow';
    const leftRailOverlay = leftRailOpen && viewportMode === 'narrow';
    const showWorkbench = appMode === 'assistant' || appMode === 'orchestrator';
    const reservedShellPadding = viewportMode === 'narrow' ? 12 : 24;
    const availableMainWidth = Math.max(320, viewportWidth - reservedShellPadding);
    const minMainWidthForSideWorkbench = viewportMode === 'wide' ? 700 : 620;
    const canUseSideWorkbench = availableMainWidth >= sideWorkbenchWidth + minMainWidthForSideWorkbench;
    const useSideWorkbench = showWorkbench && workbenchOpen && canUseSideWorkbench;
    const shellGridStyle =
        leftRailVisible && !leftRailOverlay
            ? { gridTemplateColumns: `${String(leftRailWidth)}px 6px minmax(0, 1fr)` }
            : undefined;
    const contentGridStyle = useSideWorkbench
        ? { gridTemplateColumns: `minmax(0, 1fr) 6px ${String(sideWorkbenchWidth)}px` }
        : undefined;
    const workspaceLabel = `Workspace: ${workspace.name}`;
    const objectiveLabel =
        appMode === 'chat'
            ? 'Direct conversation'
            : appMode === 'assistant'
              ? assistantSurfaceMode === 'plan'
                  ? 'Single-task plan execution'
                  : 'Single-task assistant run'
              : 'Multi-step orchestration run';
    const workbenchSummary =
        workbenchTab === 'specs' ? 'API Match = contract validation before execution.' : `Tab: ${workbenchTab}`;
    const profileSelectWidthCh = Math.max(6, operatorProfile.length + 2);

    const startResize = (target: ResizeTarget) => (event: ReactMouseEvent<HTMLDivElement | HTMLButtonElement>) => {
        if (target === 'left') {
            resizeStateRef.current = {
                target,
                startPoint: event.clientX,
                startSize: leftRailWidth,
            };
            document.body.style.cursor = 'col-resize';
        } else if (target === 'side') {
            resizeStateRef.current = {
                target,
                startPoint: event.clientX,
                startSize: sideWorkbenchWidth,
            };
            document.body.style.cursor = 'col-resize';
        } else {
            resizeStateRef.current = {
                target,
                startPoint: event.clientY,
                startSize: footerWorkbenchHeight,
            };
            document.body.style.cursor = 'row-resize';
        }

        document.body.style.userSelect = 'none';
        event.preventDefault();
    };

    const renderWorkbenchBody = () => {
        if (workbenchTab === 'diffs') {
            return (
                <div className='diff-view'>
                    <aside className='diff-tree'>
                        {Array.from(new Set(diffEntries.map((entry) => entry.folder))).map((folder) => (
                            <section key={folder}>
                                <h4>{folder}</h4>
                                <ul>
                                    {diffEntries
                                        .filter((entry) => entry.folder === folder)
                                        .map((entry) => (
                                            <li key={entry.id}>
                                                <button
                                                    type='button'
                                                    className={
                                                        selectedDiffId === entry.id ? 'diff-file active' : 'diff-file'
                                                    }
                                                    onClick={() => setSelectedDiffId(entry.id)}>
                                                    <span>{entry.path.split('/').pop()}</span>
                                                    <span className='diff-badge'>
                                                        +{entry.adds}/-{entry.removes}
                                                    </span>
                                                </button>
                                            </li>
                                        ))}
                                </ul>
                            </section>
                        ))}
                    </aside>
                    <section className='diff-detail'>
                        <header>
                            <strong>{selectedDiffEntry?.path ?? 'No file selected'}</strong>
                            {selectedDiffEntry ? (
                                <span className='diff-badge'>
                                    +{selectedDiffEntry.adds}/-{selectedDiffEntry.removes}
                                </span>
                            ) : null}
                        </header>
                        <pre>
                            {selectedDiffEntry?.hunks.map((line, index) => (
                                <span key={`${line.text}-${String(index)}`} className={`diff-line ${line.kind}`}>
                                    {line.kind === 'add' ? '+' : line.kind === 'remove' ? '-' : ' '}
                                    {line.text}
                                </span>
                            )) ?? 'Select a file to inspect its patch.'}
                        </pre>
                    </section>
                </div>
            );
        }

        if (workbenchTab === 'terminal') {
            return (
                <div className='terminal-stub'>
                    <p>$ kilo env preview --workspace kmp --mode sandbox</p>
                    <p>{'> copied 114 files, skipped 289, exceptions 3'}</p>
                    <p>$ kilo agents status --farm</p>
                    <p>{'> planner=online coder=online reviewer=online'}</p>
                </div>
            );
        }

        if (workbenchTab === 'problems') {
            return (
                <ul className='problem-list'>
                    <li>API spec mismatch: `executionEnvironment` required in POST /sessions</li>
                    <li>Secret-risk pattern: `.env` in whitelist exceptions</li>
                </ul>
            );
        }

        if (workbenchTab === 'files') {
            return (
                <ul className='problem-list'>
                    <li>src/pages/index.tsx</li>
                    <li>src/pages/scenarioData.ts</li>
                    <li>src/pages/markdownRenderer.tsx</li>
                </ul>
            );
        }

        if (workbenchTab === 'context') {
            return (
                <div className='context-tags'>
                    <span>Mode: {appMode}</span>
                    <span>Assistant Plan Mode: {assistantSurfaceMode}</span>
                    <span>Workspace: {workspace.name}</span>
                    <span>Environment: {executionEnvironmentLabel(workspace.environment)}</span>
                    <span>Provider: {providerProfile}</span>
                    <span>Effort: {reasoningEffort}</span>
                </div>
            );
        }

        if (workbenchTab === 'browser') {
            return (
                <div className='stub-grid'>
                    <div className='browser-head'>
                        <h4>Dev Preview (stub)</h4>
                        <label className='inspect-toggle'>
                            <input
                                type='checkbox'
                                checked={browserInspectEnabled}
                                onChange={(event) => setBrowserInspectEnabled(event.target.checked)}
                            />
                            Inspect to source
                        </label>
                    </div>
                    <div className='fake-browser-canvas'>
                        {browserElements.map((element) => (
                            <button
                                key={element.id}
                                type='button'
                                className='inspectable-element'
                                onClick={() => {
                                    if (!browserInspectEnabled) {
                                        return;
                                    }
                                    addElementToComposer(element.source);
                                }}>
                                {element.label}
                                <small>{element.source}</small>
                            </button>
                        ))}
                    </div>
                </div>
            );
        }

        if (workbenchTab === 'providers') {
            return (
                <div className='provider-grid'>
                    {[
                        ['Kilo Core', 'Connected', '42 ms'],
                        ['OpenAI', 'Connected', '118 ms'],
                        ['Anthropic', 'Standby', 'n/a'],
                    ].map(([name, status, latency]) => (
                        <article key={name}>
                            <h4>{name}</h4>
                            <p>{status}</p>
                            <small>Latency: {latency}</small>
                        </article>
                    ))}
                </div>
            );
        }

        if (workbenchTab === 'agents') {
            return (
                <div className='provider-grid'>
                    {[
                        ['Planner', 'running'],
                        ['Coder', 'running'],
                        ['Reviewer', 'queued'],
                        ['Spec Matcher', 'running'],
                        ['Terminal Agent', 'queued'],
                    ].map(([name, status]) => (
                        <article key={name}>
                            <h4>{name}</h4>
                            <p>{status}</p>
                            <small>shared bus: connected</small>
                        </article>
                    ))}
                </div>
            );
        }

        return (
            <div className='terminal-stub'>
                <p>API contract matching panel</p>
                <p>Purpose: catch request/response mismatches before execution.</p>
                <p>{'POST /sessions => warning: missing required `executionEnvironment`'}</p>
                <p>GET /threads =&gt; ok</p>
                <p>POST /sandbox/preview =&gt; ok</p>
            </div>
        );
    };

    const renderWorkbenchPanel = (variant: 'footer' | 'side') => (
        <div
            className={variant === 'side' ? 'workbench-footer side' : 'workbench-footer'}
            style={variant === 'footer' ? { height: `${String(footerWorkbenchHeight)}px` } : undefined}>
            {variant === 'footer' ? (
                <div
                    className='panel-resizer horizontal'
                    role='separator'
                    aria-orientation='horizontal'
                    onMouseDown={startResize('footer')}
                />
            ) : null}
            {variant === 'side' ? (
                <div className='workbench-footer-head'>
                    <strong>Workbench</strong>
                    <span>{workbenchSummary}</span>
                </div>
            ) : null}
            <div className='workbench-tabs'>
                {workbenchTabs.map((tab) => (
                    <button
                        key={tab.id}
                        type='button'
                        className={workbenchTab === tab.id ? 'workbench-tab active' : 'workbench-tab'}
                        onClick={() => {
                            setWorkbenchTab(tab.id);
                            setWorkbenchOpen(true);
                        }}>
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>
            {workbenchOpen ? <div className='workbench-body'>{renderWorkbenchBody()}</div> : null}
        </div>
    );

    return (
        <div className='app-shell'>
            <div className='ambient-gradient' />

            <header className='topbar'>
                <div className='topbar-left'>
                    <button
                        type='button'
                        className='workspace-toggle-btn'
                        aria-label='Toggle workspace panel'
                        onClick={() => setLeftRailOpen((prev) => !prev)}>
                        <VscLayoutSidebarLeft />
                        <span className='workspace-toggle-label'>
                            {leftRailOpen ? 'Collapse Workspace' : 'Show Workspace'}
                        </span>
                    </button>
                    <div className='brand-block'>
                        <span className='brand-mini'>KiloDesktop</span>
                        <button type='button' className='thread-title-btn'>
                            {scenario.threadTitle}
                            <VscChevronDown />
                        </button>
                    </div>
                </div>

                <div className='topbar-center-tag'>Conversation Workspace</div>

                <div className='topbar-right'>
                    {import.meta.env.DEV ? (
                        <label className='scenario-picker'>
                            <span>Scenario</span>
                            <select value={scenarioId} onChange={(event) => setScenarioId(event.target.value)}>
                                {scenarios.map((entry) => (
                                    <option key={entry.id} value={entry.id}>
                                        {entry.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                    ) : null}

                    <button type='button' className='workspace-pill' onClick={() => setWorkspaceSheetOpen(true)}>
                        <span>{workspaceLabel}</span>
                        <VscChevronDown />
                    </button>

                    <span className='status-chip'>
                        <VscShield />
                        <span className='dot small success' />
                        Policy
                    </span>
                    <span className='status-chip'>
                        <VscLock />
                        Safe
                    </span>
                    <button type='button' className='icon-btn'>
                        <VscExtensions />
                    </button>
                </div>
            </header>

            <div className='shell-grid' style={shellGridStyle}>
                {leftRailVisible ? (
                    <aside className='left-rail' style={{ width: `${String(leftRailWidth)}px` }}>
                        <div className='left-rail-head'>
                            <div>
                                <h2>Threads</h2>
                                <p>Workspace grouped</p>
                            </div>
                            <button type='button' className='icon-btn subtle' onClick={() => setLeftRailOpen(false)}>
                                <VscChromeClose />
                            </button>
                        </div>

                        <label className='compact-search'>
                            <VscSearch />
                            <input type='search' placeholder='Search threads' />
                        </label>

                        <div className='tag-block'>
                            <h3>Focus Tags</h3>
                            <div className='tag-row'>
                                {threadTags.map((tag) => (
                                    <span key={tag.label} className={`tag-chip tone-${tag.tone}`}>
                                        <strong>{tag.label}</strong>
                                        <small>{tag.count}</small>
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className='thread-groups'>
                            {threadGroups.map((group) => (
                                <section
                                    key={group.workspace}
                                    className={
                                        workspace.name === group.workspace ? 'thread-group active' : 'thread-group'
                                    }>
                                    <header>
                                        <button type='button' onClick={() => switchWorkspace(group.workspace)}>
                                            <strong>{group.workspace}</strong>
                                            <small>{executionEnvironmentLabel(group.environment)}</small>
                                        </button>
                                        <span>{group.threads.length}</span>
                                    </header>
                                    <p>{group.workspacePath}</p>
                                    <ul>
                                        {group.threads.map((thread) => (
                                            <li key={`${group.workspace}-${thread}`}>
                                                <button
                                                    type='button'
                                                    className={
                                                        thread === scenario.threadTitle
                                                            ? 'thread-item active'
                                                            : 'thread-item'
                                                    }>
                                                    <span>{thread}</span>
                                                    <VscEllipsis />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            ))}
                        </div>
                    </aside>
                ) : null}
                {leftRailVisible && !leftRailOverlay ? (
                    <div
                        className='panel-resizer vertical'
                        role='separator'
                        aria-orientation='vertical'
                        onMouseDown={startResize('left')}
                    />
                ) : null}

                <main className='main-surface'>
                    <div className='context-lane'>
                        <div className='context-lane-left'>
                            <span className='context-label'>Active Objective</span>
                            <strong>{objectiveLabel}</strong>
                            {appMode === 'assistant' ? (
                                <div className='assistant-mode-switch'>
                                    <button
                                        type='button'
                                        className={assistantSurfaceMode === 'task' ? 'tiny-pill active' : 'tiny-pill'}
                                        onClick={() => setAssistantSurfaceMode('task')}>
                                        Task
                                    </button>
                                    <button
                                        type='button'
                                        className={assistantSurfaceMode === 'plan' ? 'tiny-pill active' : 'tiny-pill'}
                                        onClick={() => setAssistantSurfaceMode('plan')}>
                                        Plan
                                    </button>
                                </div>
                            ) : null}
                            {appMode !== 'chat' ? (
                                <button
                                    type='button'
                                    className={surfacePanelOpen ? 'tiny-pill active' : 'tiny-pill'}
                                    onClick={() => setSurfacePanelOpen((prev) => !prev)}>
                                    {surfacePanelOpen ? 'Hide Surfaces' : 'Show Surfaces'}
                                </button>
                            ) : null}
                        </div>

                        <div className='context-lane-right'>
                            <span>
                                <VscSymbolEvent />
                                {toSentenceCase(appMode)}
                            </span>
                            <span>
                                <VscPulse />
                                Latency 118ms
                            </span>
                            <span>
                                <VscArchive />
                                Context 13 files
                            </span>
                            <span>
                                <VscExtensions />
                                Providers 3
                            </span>
                        </div>
                    </div>

                    <div
                        className={useSideWorkbench ? 'content-grid has-side-workbench' : 'content-grid'}
                        style={contentGridStyle}>
                        <section className='timeline-surface'>
                            <div className='timeline-scroll'>
                                <section className='activity-card'>
                                    <header className='activity-card-head'>
                                        <div>
                                            <span className='context-label'>Run Timeline</span>
                                            <strong>Compact execution graph</strong>
                                        </div>
                                        <div className='activity-card-actions'>
                                            <span className='activity-live-pill'>
                                                <span className='dot small success' />
                                                {liveRuntimeLabel}
                                            </span>
                                            <button
                                                type='button'
                                                className='session-summary-toggle'
                                                onClick={() => setActivityDetailsOpen((prev) => !prev)}>
                                                {activityDetailsOpen ? 'Hide log' : 'Show log'}
                                                <VscChevronDown className={activityDetailsOpen ? 'open' : ''} />
                                            </button>
                                        </div>
                                    </header>
                                    <div className='activity-graph-row compact'>
                                        <div className='activity-mini-chart' aria-label='Run timeline graph'>
                                            {activityColumns.map((item) => (
                                                <span
                                                    key={`spark-${item.id}`}
                                                    className={activityKindClass(item.kind)}
                                                    title={`${item.label}: ${item.detail}`}
                                                    style={{ '--bar-height': String(item.height) } as CSSProperties}
                                                />
                                            ))}
                                        </div>
                                        <div className='activity-track'>
                                            <span style={{ width: `${String(activityCompletion)}%` }} />
                                        </div>
                                        <div className='activity-stats-row'>
                                            <span className='stat-strong'>{activityTokenMetric}</span>
                                            <span>{activityContextMetric}</span>
                                            <span className='stat-positive'>+{activityDeltaAdds}</span>
                                            <span className='stat-negative'>-{activityDeltaRemoves}</span>
                                            <span>{activityCostMetric}</span>
                                        </div>
                                        <div className='activity-metrics'>
                                            <span>events {activitySequence.length}</span>
                                            <span>thinking {activityCounts.thinking}</span>
                                            <span>response {activityCounts.response}</span>
                                            <span>policy {activityCounts.policy}</span>
                                            <span>errors {activityCounts.error}</span>
                                        </div>
                                        {latestActivity ? (
                                            <p className='activity-latest'>
                                                latest <strong>{latestActivity.label}</strong> - {latestActivity.detail}
                                            </p>
                                        ) : null}
                                    </div>
                                    {activityDetailsOpen ? (
                                        <div className='activity-log-list'>
                                            {activityFeed.map((item) => (
                                                <div key={item.id} className='activity-log-row'>
                                                    <span className={activityKindClass(item.kind)} />
                                                    <div className='activity-log-copy'>
                                                        <strong>{item.label}</strong>
                                                        <small>{item.detail}</small>
                                                    </div>
                                                </div>
                                            ))}
                                            {scenario.policyItems.length ? (
                                                <div className='policy-row'>
                                                    {scenario.policyItems.map((item) => (
                                                        <button
                                                            key={item.id}
                                                            type='button'
                                                            className='policy-chip'
                                                            {...interactions(item.inspectableId)}>
                                                            <span className={statusClass(item.status)} />
                                                            {item.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : null}
                                        </div>
                                    ) : null}
                                </section>

                                {appMode === 'assistant' && surfacePanelOpen ? (
                                    <section className='assistant-surface'>
                                        {assistantSurfaceMode === 'task' ? (
                                            <article className='plan-card'>
                                                <div className='card-head'>
                                                    <h3>
                                                        <VscDesktopDownload />
                                                        Single Task Surface
                                                    </h3>
                                                    <span>Assistant mode</span>
                                                </div>
                                                <p className='surface-copy'>
                                                    Assistant executes one focused task with provider routing, API spec
                                                    checks, and sandbox-aware environment controls.
                                                </p>
                                                <div className='artifact-row'>
                                                    <span className='artifact-chip'>
                                                        Execution: {executionEnvironmentLabel(workspace.environment)}
                                                    </span>
                                                    <span className='artifact-chip'>Provider Router: active</span>
                                                    <span className='artifact-chip'>Spec Matcher: warning</span>
                                                </div>
                                            </article>
                                        ) : (
                                            <article className='plan-card'>
                                                <div className='card-head'>
                                                    <h3>
                                                        <VscChecklist />
                                                        Assistant Plan
                                                    </h3>
                                                    <span>{assistantPlan.length} steps</span>
                                                </div>
                                                <p className='surface-copy'>
                                                    Plan clarifies execution order for a single request: intent capture,
                                                    provider/spec checks, execution, and return artifacts.
                                                </p>
                                                <ol>
                                                    {assistantPlan.map((step) => (
                                                        <li key={step.id}>
                                                            <div>
                                                                <strong>{step.title}</strong>
                                                                <small>{step.owner}</small>
                                                            </div>
                                                            <span className={`plan-status ${step.status}`}>
                                                                {planStatusLabel(step.status)}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ol>
                                            </article>
                                        )}
                                    </section>
                                ) : null}

                                {appMode === 'orchestrator' && surfacePanelOpen ? (
                                    <section className='orchestrator-grid'>
                                        <article className='plan-card'>
                                            <div className='card-head'>
                                                <h3>
                                                    <VscChecklist />
                                                    Plan
                                                </h3>
                                                <span>{orchestratorPlan.length} steps</span>
                                            </div>
                                            <p className='surface-copy'>
                                                Multi-step roadmap for orchestrator: each step has an owner and feeds
                                                subtasks/artifacts below.
                                            </p>
                                            <ol>
                                                {orchestratorPlan.map((step) => (
                                                    <li key={step.id}>
                                                        <div>
                                                            <strong>{step.title}</strong>
                                                            <small>{step.owner}</small>
                                                        </div>
                                                        <span className={`plan-status ${step.status}`}>
                                                            {planStatusLabel(step.status)}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ol>
                                        </article>

                                        <article className='subtask-card'>
                                            <div className='card-head'>
                                                <h3>
                                                    <VscLayers />
                                                    Subtasks
                                                </h3>
                                                <span>{runningSubtasks} running</span>
                                            </div>
                                            <ul>
                                                {orchestratorSubtasks.map((task) => (
                                                    <li key={task.id}>
                                                        <button
                                                            type='button'
                                                            className={
                                                                peekId === task.inspectableId
                                                                    ? 'subtask-row active'
                                                                    : 'subtask-row'
                                                            }
                                                            {...interactions(task.inspectableId)}>
                                                            <span className={statusClass(task.status)} />
                                                            <div>
                                                                <strong>{task.title}</strong>
                                                                <small>
                                                                    {task.owner} · {task.lastUpdate}
                                                                </small>
                                                            </div>
                                                            <span>{task.artifacts}</span>
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </article>

                                        <article className='artifact-card'>
                                            <div className='card-head'>
                                                <h3>
                                                    <VscBook />
                                                    Artifacts
                                                </h3>
                                                <span>{orchestratorArtifacts.length} files</span>
                                            </div>
                                            <div className='artifact-row'>
                                                {orchestratorArtifacts.map((artifact) => (
                                                    <span key={artifact.id} className='artifact-chip'>
                                                        {artifact.label}
                                                    </span>
                                                ))}
                                            </div>
                                        </article>
                                    </section>
                                ) : null}

                                {appMode !== 'chat' && !surfacePanelOpen ? (
                                    <article className='surface-collapsed'>
                                        <p>
                                            {appMode === 'assistant'
                                                ? `Assistant surface hidden • ${String(assistantPlan.length)} steps available`
                                                : `Orchestrator surface hidden • ${String(orchestratorPlan.length)} plan steps • ${String(runningSubtasks)} running`}
                                        </p>
                                    </article>
                                ) : null}

                                <div className='timeline-stream'>
                                    {timelineMessages
                                        .filter(
                                            (message) => message.role !== 'system' || isAgentTimelineEntry(message.text)
                                        )
                                        .map((message) => (
                                            <article key={message.id} className={`timeline-item role-${message.role}`}>
                                                <header>
                                                    <span>
                                                        {message.role === 'assistant'
                                                            ? 'Assistant'
                                                            : message.role === 'user'
                                                              ? 'You'
                                                              : 'System'}
                                                    </span>
                                                    <small>{message.role === 'system' ? 'event' : 'now'}</small>
                                                </header>

                                                {message.role === 'assistant' ? (
                                                    <MarkdownRenderer content={message.text} />
                                                ) : (
                                                    <p>{message.text}</p>
                                                )}

                                                {message.fileRefs?.length ? (
                                                    <div className='file-chip-row'>
                                                        {message.fileRefs.map((ref) => (
                                                            <button
                                                                key={ref.inspectableId}
                                                                type='button'
                                                                className='file-chip'
                                                                {...interactions(ref.inspectableId)}>
                                                                <VscCode />
                                                                {ref.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                ) : null}
                                            </article>
                                        ))}
                                </div>
                            </div>
                        </section>
                        {useSideWorkbench ? (
                            <div
                                className='panel-resizer vertical'
                                role='separator'
                                aria-orientation='vertical'
                                onMouseDown={startResize('side')}
                            />
                        ) : null}
                        {useSideWorkbench ? (
                            <aside className='workbench-side-shell'>{renderWorkbenchPanel('side')}</aside>
                        ) : null}
                    </div>

                    <section className='composer-dock'>
                        <div className='composer-card'>
                            <div className='composer-runtime-strip'>
                                <div className='runtime-left'>
                                    <div className='runtime-mode-switch'>
                                        {(['chat', 'assistant', 'orchestrator'] as const).map((mode) => (
                                            <button
                                                key={`runtime-${mode}`}
                                                type='button'
                                                className={appMode === mode ? 'tiny-pill active' : 'tiny-pill'}
                                                onClick={() => setAppMode(mode)}>
                                                {toSentenceCase(mode)}
                                            </button>
                                        ))}
                                    </div>
                                    <label>
                                        Environment
                                        <select
                                            className='runtime-select'
                                            value={workspace.environment}
                                            onChange={(event) =>
                                                changeEnvironment(event.target.value as ExecutionEnvironment)
                                            }>
                                            <option value='local'>Local</option>
                                            <option value='sandbox'>Worktree</option>
                                            <option value='cloud'>Cloud</option>
                                        </select>
                                    </label>
                                    <label>
                                        Provider
                                        <select
                                            className='runtime-select'
                                            value={providerProfile}
                                            onChange={(event) => setProviderProfile(event.target.value)}>
                                            {providerProfiles.map((provider) => (
                                                <option key={provider} value={provider}>
                                                    {provider}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label>
                                        Effort
                                        <select
                                            className='runtime-select'
                                            value={reasoningEffort}
                                            onChange={(event) =>
                                                setReasoningEffort(event.target.value as ReasoningEffort)
                                            }>
                                            <option value='Low'>Low</option>
                                            <option value='Medium'>Medium</option>
                                            <option value='High'>High</option>
                                            <option value='Extreme'>Extreme</option>
                                        </select>
                                    </label>
                                </div>
                                <div className='runtime-right'>
                                    {showWorkbench ? (
                                        <button
                                            type='button'
                                            className={workbenchOpen ? 'workbench-toggle active' : 'workbench-toggle'}
                                            onClick={() => setWorkbenchOpen((prev) => !prev)}>
                                            <VscDesktopDownload />
                                            {workbenchOpen ? 'Hide Workbench' : 'Open Workbench'}
                                        </button>
                                    ) : null}
                                    <label>
                                        Profile
                                        <select
                                            className='runtime-select'
                                            value={operatorProfile}
                                            style={{ width: `${String(profileSelectWidthCh)}ch` }}
                                            onChange={(event) => setOperatorProfile(event.target.value)}>
                                            {operatorProfiles.map((profile) => (
                                                <option key={profile} value={profile}>
                                                    {profile}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                </div>
                            </div>
                            {composerSelections.length ? (
                                <div className='composer-chip-row'>
                                    {composerSelections.map((chip) => (
                                        <button
                                            key={chip}
                                            type='button'
                                            className='composer-chip'
                                            onClick={() => removeSelectionChip(chip)}>
                                            {chip}
                                            <VscChromeClose />
                                        </button>
                                    ))}
                                </div>
                            ) : null}

                            <textarea
                                value={composerText}
                                onChange={(event) => setComposerText(event.target.value)}
                                placeholder='Ask KiloDesktop...'
                            />

                            <div className='composer-actions'>
                                <span>
                                    <VscInfo />
                                    deterministic fixtures only
                                </span>
                                <button type='button' onClick={submitComposer}>
                                    Send
                                </button>
                            </div>
                        </div>
                        {showWorkbench && workbenchOpen && !useSideWorkbench ? renderWorkbenchPanel('footer') : null}
                    </section>
                </main>
            </div>

            {leftRailOverlay ? (
                <div className='overlay-layer' onClick={() => setLeftRailOpen(false)}>
                    <aside className='left-rail overlay' onClick={(event) => event.stopPropagation()}>
                        <div className='left-rail-head'>
                            <div>
                                <h2>Threads</h2>
                                <p>Workspace grouped</p>
                            </div>
                            <button type='button' className='icon-btn subtle' onClick={() => setLeftRailOpen(false)}>
                                <VscChromeClose />
                            </button>
                        </div>
                        <label className='compact-search'>
                            <VscSearch />
                            <input type='search' placeholder='Search threads' />
                        </label>
                        <div className='tag-block'>
                            <h3>Focus Tags</h3>
                            <div className='tag-row'>
                                {threadTags.map((tag) => (
                                    <span key={`overlay-${tag.label}`} className={`tag-chip tone-${tag.tone}`}>
                                        <strong>{tag.label}</strong>
                                        <small>{tag.count}</small>
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className='thread-groups'>
                            {threadGroups.map((group) => (
                                <section
                                    key={`overlay-${group.workspace}`}
                                    className={
                                        workspace.name === group.workspace ? 'thread-group active' : 'thread-group'
                                    }>
                                    <header>
                                        <button type='button' onClick={() => switchWorkspace(group.workspace)}>
                                            <strong>{group.workspace}</strong>
                                            <small>{executionEnvironmentLabel(group.environment)}</small>
                                        </button>
                                        <span>{group.threads.length}</span>
                                    </header>
                                    <ul>
                                        {group.threads.map((thread) => (
                                            <li key={`overlay-${group.workspace}-${thread}`}>
                                                <button
                                                    type='button'
                                                    className={
                                                        thread === scenario.threadTitle
                                                            ? 'thread-item active'
                                                            : 'thread-item'
                                                    }>
                                                    <span>{thread}</span>
                                                    <VscEllipsis />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            ))}
                        </div>
                    </aside>
                </div>
            ) : null}

            {workspaceSheetOpen ? (
                <div className='overlay-layer' onClick={() => setWorkspaceSheetOpen(false)}>
                    <section
                        className={`workspace-sheet ${viewportMode === 'narrow' ? 'mobile' : ''}`}
                        onClick={(event) => event.stopPropagation()}>
                        <header>
                            <h2>Workspace & Environment</h2>
                            <button
                                type='button'
                                className='icon-btn subtle'
                                onClick={() => setWorkspaceSheetOpen(false)}>
                                <VscChromeClose />
                            </button>
                        </header>

                        <div className='sheet-section'>
                            <h3>
                                <VscFolder />
                                Workspace
                            </h3>
                            <label>
                                Workspace selector
                                <select
                                    value={workspace.name}
                                    onChange={(event) => {
                                        const option = workspaceOptions.find(
                                            (entry) => entry.name === event.target.value
                                        );
                                        if (!option) {
                                            return;
                                        }
                                        setWorkspace((prev) => ({ ...prev, name: option.name, path: option.path }));
                                    }}>
                                    {workspaceOptions.map((option) => (
                                        <option key={option.name} value={option.name}>
                                            {option.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <p className='workspace-path'>{workspace.path}</p>
                        </div>

                        <div className='sheet-section'>
                            <h3>
                                <VscDebug />
                                Environment
                            </h3>
                            <label className='radio-row'>
                                <input
                                    type='radio'
                                    checked={workspace.environment === 'local'}
                                    onChange={() => changeEnvironment('local')}
                                />
                                <div>
                                    <strong>Local</strong>
                                    <small>Direct execution in current workspace.</small>
                                </div>
                            </label>
                            <label className='radio-row'>
                                <input
                                    type='radio'
                                    checked={workspace.environment === 'sandbox'}
                                    onChange={() => changeEnvironment('sandbox')}
                                />
                                <div>
                                    <strong>Sandbox Copy</strong>
                                    <small>Worktree semantics (not git worktrees), isolated copy.</small>
                                </div>
                            </label>
                            <label className='radio-row'>
                                <input
                                    type='radio'
                                    checked={workspace.environment === 'cloud'}
                                    onChange={() => changeEnvironment('cloud')}
                                />
                                <div>
                                    <strong>Cloud</strong>
                                    <small>Kilo cloud session placeholder.</small>
                                </div>
                            </label>
                        </div>

                        {workspace.environment === 'sandbox' ? (
                            <div className='sheet-section'>
                                <h3>
                                    <VscLayers />
                                    Sandbox Configuration
                                </h3>
                                <div className='exclusion-list'>
                                    <span>Exclusions</span>
                                    <div>
                                        {workspace.sandbox.exclusions.map((entry) => (
                                            <span key={entry} className='inline-chip'>
                                                {entry}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <label className='toggle-row'>
                                    <input
                                        type='checkbox'
                                        checked={workspace.sandbox.respectGitignore}
                                        onChange={(event) =>
                                            setWorkspace((prev) => ({
                                                ...prev,
                                                sandbox: { ...prev.sandbox, respectGitignore: event.target.checked },
                                            }))
                                        }
                                    />
                                    Respect .gitignore
                                </label>
                                <label className='toggle-row'>
                                    <input
                                        type='checkbox'
                                        checked={workspace.sandbox.respectKilocodeIgnore}
                                        onChange={(event) =>
                                            setWorkspace((prev) => ({
                                                ...prev,
                                                sandbox: {
                                                    ...prev.sandbox,
                                                    respectKilocodeIgnore: event.target.checked,
                                                },
                                            }))
                                        }
                                    />
                                    Respect .kilocodeignore
                                </label>

                                <div className='allowlist-block'>
                                    <span>Whitelist exceptions</span>
                                    <div className='allowlist-input-row'>
                                        <input
                                            value={sandboxPatternInput}
                                            onChange={(event) => setSandboxPatternInput(event.target.value)}
                                            placeholder='Add pattern like .env.*'
                                        />
                                        <button type='button' onClick={addWhitelistPattern}>
                                            Add
                                        </button>
                                    </div>
                                    <div className='allowlist-hints'>
                                        {whitelistExamples.map((example) => (
                                            <button
                                                key={example}
                                                type='button'
                                                className='inline-chip muted'
                                                onClick={() => setSandboxPatternInput(example)}>
                                                {example}
                                            </button>
                                        ))}
                                    </div>
                                    <div className='allowlist-row'>
                                        {workspace.sandbox.whitelistPatterns.length ? (
                                            workspace.sandbox.whitelistPatterns.map((pattern) => (
                                                <button
                                                    key={pattern}
                                                    type='button'
                                                    className='allowlist-chip'
                                                    onClick={() => removeWhitelistPattern(pattern)}>
                                                    {pattern}
                                                    {pattern.includes('.env') ? (
                                                        <span className='risk-badge'>May contain secrets</span>
                                                    ) : null}
                                                    <VscChromeClose />
                                                </button>
                                            ))
                                        ) : (
                                            <span className='empty-text'>No exceptions configured.</span>
                                        )}
                                    </div>
                                </div>

                                <button type='button' className='preview-btn' onClick={previewSandbox}>
                                    Preview copy set
                                </button>
                                <p className='preview-summary'>
                                    Will copy {workspace.sandbox.preview.copied} files, skip{' '}
                                    {workspace.sandbox.preview.skipped} files, include{' '}
                                    {workspace.sandbox.preview.includedByException} by exception.
                                </p>
                                <div className='sandbox-action-row'>
                                    <button type='button' onClick={() => runSandboxAction('create')}>
                                        Create Sandbox
                                    </button>
                                    <button type='button' onClick={() => runSandboxAction('rebuild')}>
                                        Rebuild
                                    </button>
                                    <button type='button' onClick={() => runSandboxAction('reset')}>
                                        Reset
                                    </button>
                                </div>
                                {sandboxProgress ? (
                                    <div className='progress-wrap'>
                                        <span>
                                            {toSentenceCase(sandboxProgress.action)}{' '}
                                            {sandboxProgress.active ? 'in progress' : 'done'}
                                        </span>
                                        <div className='progress-track'>
                                            <span style={{ width: `${String(sandboxProgress.progress)}%` }} />
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        ) : null}

                        {workspace.environment === 'cloud' ? (
                            <div className='sheet-section'>
                                <h3>
                                    <VscCloud />
                                    Cloud Session
                                </h3>
                                <p className='empty-text'>Connect and start a cloud session. UI placeholder only.</p>
                                <div className='cloud-status-row'>
                                    <span className={workspace.cloudConnected ? 'cloud-chip connected' : 'cloud-chip'}>
                                        {workspace.cloudConnected ? 'Connected' : 'Disconnected'}
                                    </span>
                                    <button type='button' onClick={openCloudSession}>
                                        Start session
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </section>
                </div>
            ) : null}

            {pinnedPeekIds.length ? (
                <aside className='peek-stack-rail'>
                    {pinnedPeekIds.map((inspectableId) => {
                        const item = inspectables[inspectableId];
                        if (!item) {
                            return null;
                        }
                        const selected = peekId === inspectableId;
                        return (
                            <button
                                key={inspectableId}
                                type='button'
                                className={selected ? 'peek-stack-item active' : 'peek-stack-item'}
                                onClick={() => setPeekId(inspectableId)}>
                                <span className={statusClass(item.status)} />
                                <span>{item.title.split('/').pop() ?? item.title}</span>
                            </button>
                        );
                    })}
                </aside>
            ) : null}

            {activePeekItem ? (
                <>
                    {viewportMode !== 'wide' ? <div className='peek-backdrop' onClick={() => setPeekId(null)} /> : null}
                    <section className={`peek-sheet ${viewportMode === 'narrow' ? 'mobile' : ''}`}>
                        <header>
                            <div>
                                <h3>{activePeekItem.title}</h3>
                                <small>
                                    <span className={statusClass(activePeekItem.status)} />
                                    {toSentenceCase(activePeekItem.status)}
                                </small>
                            </div>
                            <div className='peek-actions'>
                                <button type='button' onClick={() => togglePin(activePeekItem.id)}>
                                    {pinnedPeekIds.includes(activePeekItem.id) ? 'Unpin' : 'Pin'}
                                </button>
                                <button type='button' className='icon-btn subtle' onClick={() => setPeekId(null)}>
                                    <VscChromeClose />
                                </button>
                            </div>
                        </header>

                        <div className='peek-body'>
                            <p>{activePeekItem.summary}</p>
                            <ul>
                                {activePeekItem.details.map((detail) => (
                                    <li key={detail}>{detail}</li>
                                ))}
                            </ul>

                            <div className='peek-meta'>
                                <span>
                                    <VscPulse />
                                    Last update {activePeekItem.lastUpdate}
                                </span>
                                <span>
                                    <VscArchive />
                                    {activePeekItem.artifactCount} artifacts
                                </span>
                            </div>

                            {activePeekItem.filePreview ? (
                                <FilePreviewCode
                                    language={activePeekItem.filePreview.language}
                                    code={activePeekItem.filePreview.content}
                                    title={activePeekItem.filePreview.path}
                                />
                            ) : null}
                        </div>
                    </section>
                </>
            ) : null}

            {glance
                ? createPortal(
                      <div
                          className='glance-card'
                          style={{ left: `${String(glance.x)}px`, top: `${String(glance.y)}px` }}>
                          <h4>{glance.item.title}</h4>
                          <p>{glance.item.summary}</p>
                          <div>
                              <span>
                                  <span className={statusClass(glance.item.status)} />
                                  {toSentenceCase(glance.item.status)}
                              </span>
                              <span>{glance.item.lastUpdate}</span>
                              <span>{glance.item.artifactCount} artifacts</span>
                          </div>
                      </div>,
                      document.body
                  )
                : null}
        </div>
    );
}
