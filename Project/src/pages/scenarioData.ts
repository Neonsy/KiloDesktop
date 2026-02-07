export type AppMode = 'chat' | 'assistant' | 'orchestrator';
export type ExecutionEnvironment = 'local' | 'sandbox' | 'cloud';
export type SubtaskStatus = 'queued' | 'running' | 'done' | 'blocked';
export type ItemStatus = 'idle' | 'running' | 'ok' | 'warning' | 'error';

export interface SandboxPreset {
    exclusions: string[];
    respectGitignore: boolean;
    respectKilocodeIgnore: boolean;
    whitelistPatterns: string[];
    preview: {
        copied: number;
        skipped: number;
        includedByException: number;
    };
}

export interface WorkspacePreset {
    name: string;
    path: string;
    environment: ExecutionEnvironment;
    sandbox: SandboxPreset;
    cloudConnected: boolean;
}

export interface TimelineMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    text: string;
    fileRefs?: Array<{ label: string; inspectableId: string }>;
}

export interface PolicyItem {
    id: string;
    label: string;
    status: ItemStatus;
    inspectableId: string;
}

export interface PlanStep {
    id: string;
    title: string;
    owner: string;
    status: 'pending' | 'active' | 'complete';
}

export interface Subtask {
    id: string;
    title: string;
    owner: string;
    status: SubtaskStatus;
    lastUpdate: string;
    artifacts: number;
    inspectableId: string;
}

export interface ArtifactItem {
    id: string;
    label: string;
    type: 'diff' | 'report' | 'log';
}

export interface InspectableItem {
    id: string;
    type: 'file' | 'policy' | 'subtask';
    title: string;
    status: ItemStatus;
    lastUpdate: string;
    artifactCount: number;
    summary: string;
    details: string[];
    filePreview?: {
        path: string;
        language: 'ts' | 'bash' | 'json' | 'tsx';
        content: string;
    };
}

export interface ScenarioData {
    id: string;
    label: string;
    threadTitle: string;
    defaultMode: AppMode;
    reasoningEffort: 'Low' | 'Medium' | 'High' | 'Extreme';
    policyItems: PolicyItem[];
    timeline: TimelineMessage[];
    plan: PlanStep[];
    subtasks: Subtask[];
    artifacts: ArtifactItem[];
    workspacePreset: WorkspacePreset;
    initialEvents: string[];
    inspectables: Record<string, InspectableItem>;
}

const defaultSandboxPreset: SandboxPreset = {
    exclusions: ['node_modules', 'dist', 'build', '.git', '.next'],
    respectGitignore: true,
    respectKilocodeIgnore: true,
    whitelistPatterns: [],
    preview: {
        copied: 1824,
        skipped: 396,
        includedByException: 0,
    },
};

const defaultWorkspacePreset: WorkspacePreset = {
    name: 'kmp',
    path: 'M:/Neonsy/Projects/KiloDesktop/Project',
    environment: 'local',
    sandbox: defaultSandboxPreset,
    cloudConnected: false,
};

const scenarioOneInspectables: Record<string, InspectableItem> = {
    'file:assistant-parser': {
        id: 'file:assistant-parser',
        type: 'file',
        title: 'src/lib/assistant/parser.ts',
        status: 'ok',
        lastUpdate: '2m ago',
        artifactCount: 2,
        summary: 'Parser switched to deterministic tokenization for command blocks.',
        details: ['Validation rules now run before command extraction.', 'Fallback mode returns typed diagnostics.'],
        filePreview: {
            path: 'src/lib/assistant/parser.ts',
            language: 'ts',
            content: `export function parseCommand(input: string) {
  const normalized = input.trim();
  if (!normalized) {
    return { ok: false, reason: 'empty' };
  }

  const isCommand = normalized.startsWith('/');
  return {
    ok: isCommand,
    reason: isCommand ? 'parsed' : 'not-command',
  };
}`,
        },
    },
    'file:policy-engine': {
        id: 'file:policy-engine',
        type: 'file',
        title: 'src/policy/engine.ts',
        status: 'warning',
        lastUpdate: '6m ago',
        artifactCount: 1,
        summary: 'One rule still warns on elevated shell commands.',
        details: ['`allowExec` remains disabled in chat mode.', 'All readonly commands pass.'],
        filePreview: {
            path: 'src/policy/engine.ts',
            language: 'ts',
            content: `export function canRun(command: string) {
  if (command.includes('rm -rf')) {
    return { allowed: false, reason: 'destructive-command' };
  }

  return { allowed: true, reason: 'safe' };
}`,
        },
    },
    'policy:baseline': {
        id: 'policy:baseline',
        type: 'policy',
        title: 'Runtime Policy Baseline',
        status: 'ok',
        lastUpdate: '1m ago',
        artifactCount: 3,
        summary: 'Read/write boundary checks loaded and enforced.',
        details: [
            'Filesystem writes are denied in chat mode.',
            'Network calls require explicit approval in this scenario.',
        ],
    },
    'policy:safety': {
        id: 'policy:safety',
        type: 'policy',
        title: 'Safety Guardrail',
        status: 'warning',
        lastUpdate: '3m ago',
        artifactCount: 1,
        summary: 'One prompt requested a disallowed shell command.',
        details: ['User guidance shown with a safe alternative command.', 'No unsafe command was executed.'],
    },
};

const scenarioTwoInspectables: Record<string, InspectableItem> = {
    'file:sandbox-config': {
        id: 'file:sandbox-config',
        type: 'file',
        title: 'sandbox/config.json',
        status: 'running',
        lastUpdate: 'just now',
        artifactCount: 2,
        summary: 'Sandbox manifest prepared with whitelist exceptions.',
        details: ['`.env` included by exception.', 'Respect flags enabled for ignore files.'],
        filePreview: {
            path: 'sandbox/config.json',
            language: 'json',
            content: `{
  "environment": "sandbox",
  "respectGitignore": true,
  "respectKilocodeIgnore": true,
  "allowlist": [".env", ".env.*", "config/local.json"]
}`,
        },
    },
    'file:diff-summary': {
        id: 'file:diff-summary',
        type: 'file',
        title: 'artifacts/sandbox.diff',
        status: 'ok',
        lastUpdate: '45s ago',
        artifactCount: 1,
        summary: 'Diff stub created for validation of copied files.',
        details: ['114 files copied.', '3 exception files included.'],
        filePreview: {
            path: 'artifacts/sandbox.diff',
            language: 'bash',
            content: `+ .env
+ .env.development
+ config/local.json
- node_modules/*
- dist/*`,
        },
    },
    'policy:copy-guard': {
        id: 'policy:copy-guard',
        type: 'policy',
        title: 'Sandbox Copy Policy',
        status: 'warning',
        lastUpdate: '50s ago',
        artifactCount: 2,
        summary: 'Whitelist contains secret-adjacent patterns.',
        details: [
            'Pattern `.env` flagged as potentially sensitive.',
            'User confirmation required before run in production.',
        ],
    },
};

const orchestratorSubtasks: Subtask[] = [
    {
        id: 'subtask:01',
        title: 'Scan repository constraints',
        owner: 'Planner',
        status: 'done',
        lastUpdate: '6m ago',
        artifacts: 3,
        inspectableId: 'subtask:01',
    },
    {
        id: 'subtask:02',
        title: 'Draft responsive shell layout',
        owner: 'Designer',
        status: 'done',
        lastUpdate: '5m ago',
        artifacts: 2,
        inspectableId: 'subtask:02',
    },
    {
        id: 'subtask:03',
        title: 'Implement environment switcher',
        owner: 'Builder',
        status: 'running',
        lastUpdate: '2m ago',
        artifacts: 5,
        inspectableId: 'subtask:03',
    },
    {
        id: 'subtask:04',
        title: 'Wire localStorage persistence',
        owner: 'Builder',
        status: 'running',
        lastUpdate: '1m ago',
        artifacts: 2,
        inspectableId: 'subtask:04',
    },
    {
        id: 'subtask:05',
        title: 'Render markdown code blocks',
        owner: 'Renderer',
        status: 'queued',
        lastUpdate: 'just now',
        artifacts: 0,
        inspectableId: 'subtask:05',
    },
    {
        id: 'subtask:06',
        title: 'Attach copy-to-clipboard actions',
        owner: 'Renderer',
        status: 'queued',
        lastUpdate: 'just now',
        artifacts: 0,
        inspectableId: 'subtask:06',
    },
    {
        id: 'subtask:07',
        title: 'Build Browser inspect stub',
        owner: 'Workbench',
        status: 'queued',
        lastUpdate: 'just now',
        artifacts: 0,
        inspectableId: 'subtask:07',
    },
    {
        id: 'subtask:08',
        title: 'Implement Glance hover cards',
        owner: 'UX',
        status: 'queued',
        lastUpdate: 'just now',
        artifacts: 0,
        inspectableId: 'subtask:08',
    },
    {
        id: 'subtask:09',
        title: 'Implement Peek inspectors',
        owner: 'UX',
        status: 'queued',
        lastUpdate: 'just now',
        artifacts: 0,
        inspectableId: 'subtask:09',
    },
    {
        id: 'subtask:10',
        title: 'Pin subtasks to Peek Stack',
        owner: 'UX',
        status: 'queued',
        lastUpdate: 'just now',
        artifacts: 0,
        inspectableId: 'subtask:10',
    },
];

const scenarioThreeInspectables = orchestratorSubtasks.reduce<Record<string, InspectableItem>>((acc, task, index) => {
    const statusMap: Record<SubtaskStatus, ItemStatus> = {
        queued: 'idle',
        running: 'running',
        done: 'ok',
        blocked: 'error',
    };

    const preview =
        index % 2 === 0
            ? {
                  path: `logs/${task.id}.log`,
                  language: 'bash' as const,
                  content: `[${task.id}] status=${task.status}\n[${task.id}] owner=${task.owner}\n[${task.id}] artifacts=${task.artifacts}`,
              }
            : null;

    acc[task.inspectableId] = {
        id: task.inspectableId,
        type: 'subtask',
        title: task.title,
        status: statusMap[task.status],
        lastUpdate: task.lastUpdate,
        artifactCount: task.artifacts,
        summary: `${task.owner} reports ${task.status} status.`,
        details: [
            `Owner: ${task.owner}`,
            `Artifacts: ${task.artifacts}`,
            'Logs and outputs are staged for Peek inspection.',
        ],
        ...(preview ? { filePreview: preview } : {}),
    };

    return acc;
}, {});

export const scenarios: ScenarioData[] = [
    {
        id: 'chat_explain_code',
        label: 'chat_explain_code',
        threadTitle: 'Explain parser changes',
        defaultMode: 'chat',
        reasoningEffort: 'Medium',
        policyItems: [
            { id: 'policy-a', label: 'Policy baseline loaded', status: 'ok', inspectableId: 'policy:baseline' },
            { id: 'policy-b', label: 'Safety warning resolved', status: 'warning', inspectableId: 'policy:safety' },
        ],
        timeline: [
            {
                id: 'chat-user-1',
                role: 'user',
                text: 'Can you explain why parser validation changed and if commands are still blocked?',
            },
            {
                id: 'chat-assistant-1',
                role: 'assistant',
                text: `### What changed\nThe parser now validates command structure before extraction, which lowers false positives.\n\n\`\`\`ts\nexport function validateInput(raw: string) {\n  const normalized = raw.trim();\n  return normalized.startsWith('/') ? 'command' : 'text';\n}\n\`\`\`\n\n### Runtime behavior\nUnsafe commands are still blocked by policy checks.\n\n\`\`\`bash\n# disallowed\nrm -rf /\n\n# allowed\necho \"preview\"\n\`\`\``,
                fileRefs: [
                    { label: 'src/lib/assistant/parser.ts', inspectableId: 'file:assistant-parser' },
                    { label: 'src/policy/engine.ts', inspectableId: 'file:policy-engine' },
                ],
            },
        ],
        plan: [],
        subtasks: [],
        artifacts: [],
        workspacePreset: defaultWorkspacePreset,
        initialEvents: ['Session started in Local environment.'],
        inspectables: scenarioOneInspectables,
    },
    {
        id: 'assistant_sandbox_setup',
        label: 'assistant_sandbox_setup',
        threadTitle: 'Sandbox setup walkthrough',
        defaultMode: 'assistant',
        reasoningEffort: 'High',
        policyItems: [
            {
                id: 'policy-c',
                label: 'Sandbox copy policy active',
                status: 'warning',
                inspectableId: 'policy:copy-guard',
            },
        ],
        timeline: [
            {
                id: 'assistant-user-1',
                role: 'user',
                text: 'Set execution to Sandbox Copy, include .env exceptions, and show what will be copied.',
            },
            {
                id: 'assistant-system-1',
                role: 'system',
                text: 'Opened Workspace & Environment sheet with Sandbox selected.',
            },
            {
                id: 'assistant-assistant-1',
                role: 'assistant',
                text: `Sandbox configuration ready:\n\n- Respecting \`.gitignore\` and \`.kilocodeignore\`\n- Exceptions added: \`.env\`, \`.env.*\`, \`config/local.json\`\n- Preview: **114 copied**, **289 skipped**, **3 included by exception**`,
                fileRefs: [
                    { label: 'sandbox/config.json', inspectableId: 'file:sandbox-config' },
                    { label: 'artifacts/sandbox.diff', inspectableId: 'file:diff-summary' },
                ],
            },
        ],
        plan: [
            { id: 'assistant-plan-1', title: 'Resolve execution environment', owner: 'Assistant', status: 'complete' },
            { id: 'assistant-plan-2', title: 'Prepare sandbox copy rules', owner: 'Assistant', status: 'active' },
            {
                id: 'assistant-plan-3',
                title: 'Validate API spec compatibility',
                owner: 'Spec Matcher',
                status: 'active',
            },
            { id: 'assistant-plan-4', title: 'Return diff + terminal preview', owner: 'Workbench', status: 'pending' },
        ],
        subtasks: [
            {
                id: 'assistant-subtask-1',
                title: 'Provider route selection',
                owner: 'Provider Router',
                status: 'running',
                lastUpdate: 'just now',
                artifacts: 2,
                inspectableId: 'subtask:03',
            },
            {
                id: 'assistant-subtask-2',
                title: 'Sandbox copy simulation',
                owner: 'Workspace Agent',
                status: 'queued',
                lastUpdate: 'just now',
                artifacts: 1,
                inspectableId: 'subtask:04',
            },
        ],
        artifacts: [
            { id: 'artifact-diff', label: 'sandbox.diff', type: 'diff' },
            { id: 'artifact-report', label: 'provider-routing.md', type: 'report' },
        ],
        workspacePreset: {
            ...defaultWorkspacePreset,
            environment: 'sandbox',
            sandbox: {
                exclusions: ['node_modules', 'dist', 'build', '.git', '.cache'],
                respectGitignore: true,
                respectKilocodeIgnore: true,
                whitelistPatterns: ['.env', '.env.*', 'config/local.json'],
                preview: {
                    copied: 114,
                    skipped: 289,
                    includedByException: 3,
                },
            },
        },
        initialEvents: ['Environment switched: Local -> Sandbox (exceptions: .env, .env.*, config/local.json).'],
        inspectables: scenarioTwoInspectables,
    },
    {
        id: 'orchestrator_subtasks_peek',
        label: 'orchestrator_subtasks_peek',
        threadTitle: 'Orchestrator UX pass',
        defaultMode: 'orchestrator',
        reasoningEffort: 'Medium',
        policyItems: [
            { id: 'policy-d', label: 'Orchestrator policy loaded', status: 'ok', inspectableId: 'policy:baseline' },
        ],
        timeline: [
            {
                id: 'orch-system-1',
                role: 'system',
                text: 'Planner generated execution plan with 10 subtasks.',
            },
            {
                id: 'orch-assistant-1',
                role: 'assistant',
                text: 'Hover any subtask for a quick glance, click to open Peek, and pin important items to the stack rail.',
            },
        ],
        plan: [
            { id: 'plan-1', title: 'Reduce persistent chrome', owner: 'Planner', status: 'complete' },
            { id: 'plan-2', title: 'Add progressive disclosure flows', owner: 'UX', status: 'active' },
            { id: 'plan-3', title: 'Wire deterministic scenarios', owner: 'Builder', status: 'active' },
            { id: 'plan-4', title: 'Validate responsive behaviors', owner: 'QA', status: 'pending' },
        ],
        subtasks: orchestratorSubtasks,
        artifacts: [
            { id: 'artifact-plan', label: 'plan.md', type: 'report' },
            { id: 'artifact-runlog', label: 'orchestrator.log', type: 'log' },
        ],
        workspacePreset: defaultWorkspacePreset,
        initialEvents: ['Environment switched: Sandbox -> Local.'],
        inspectables: {
            ...scenarioOneInspectables,
            ...scenarioThreeInspectables,
        },
    },
];

const firstScenario = scenarios[0];

if (!firstScenario) {
    throw new Error('Scenario fixtures are required.');
}

export const defaultScenarioId = firstScenario.id;
