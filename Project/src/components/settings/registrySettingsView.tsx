import { useEffect, useState } from 'react';

import { RichContentBlocks } from '@/web/components/content/richContent';
import { parseRichContentBlocks } from '@/web/components/content/richContentModel';
import { Button } from '@/web/components/ui/button';
import { trpc } from '@/web/trpc/client';

import type { ModeDefinitionRecord, RulesetDefinitionRecord, SkillfileDefinitionRecord } from '@/app/backend/persistence/types';

type RegistryAsset = ModeDefinitionRecord | RulesetDefinitionRecord | SkillfileDefinitionRecord;

interface RegistrySettingsViewProps {
    profileId: string;
}

function previewMarkdown(markdown: string): string {
    const lines = markdown.replace(/\r\n?/g, '\n').trim().split('\n').slice(0, 6);
    return lines.join('\n').trim();
}

function AssetMeta({
    asset,
}: {
    asset: RegistryAsset;
}) {
    return (
        <div className='mt-2 flex flex-wrap gap-2 text-[11px]'>
            <span className='bg-background rounded-full px-2 py-1 font-medium'>{asset.scope}</span>
            <span className='bg-background rounded-full px-2 py-1 font-medium'>{asset.sourceKind}</span>
            {asset.tags?.map((tag) => (
                <span key={`${asset.id}:${tag}`} className='bg-primary/10 text-primary rounded-full px-2 py-1 font-medium'>
                    {tag}
                </span>
            ))}
        </div>
    );
}

function AssetCard<TAsset extends RegistryAsset>({
    asset,
    title,
    subtitle,
    bodyMarkdown,
}: {
    asset: TAsset;
    title: string;
    subtitle: string;
    bodyMarkdown: string;
}) {
    const previewBlocks = parseRichContentBlocks(previewMarkdown(bodyMarkdown));

    return (
        <article className='border-border bg-card rounded-2xl border p-4 shadow-sm'>
            <div className='flex items-start justify-between gap-3'>
                <div className='min-w-0'>
                    <p className='truncate text-sm font-semibold'>{title}</p>
                    <p className='text-muted-foreground mt-1 text-xs'>{subtitle}</p>
                    {asset.description ? <p className='text-muted-foreground mt-2 text-xs'>{asset.description}</p> : null}
                </div>
                <div className='text-right text-[11px] font-semibold'>
                    <p>{asset.enabled ? 'Enabled' : 'Disabled'}</p>
                    <p className='text-muted-foreground mt-1'>p{asset.precedence}</p>
                </div>
            </div>
            <AssetMeta asset={asset} />
            {previewBlocks.length > 0 ? (
                <div className='border-border bg-background/70 mt-3 rounded-xl border p-3'>
                    <RichContentBlocks blocks={previewBlocks} className='space-y-2' />
                </div>
            ) : null}
            {asset.originPath ? <p className='text-muted-foreground mt-3 break-all text-[11px]'>{asset.originPath}</p> : null}
        </article>
    );
}

function AssetSection<TAsset extends RegistryAsset>({
    title,
    emptyLabel,
    assets,
    renderTitle,
    renderSubtitle,
    renderBodyMarkdown,
}: {
    title: string;
    emptyLabel: string;
    assets: TAsset[];
    renderTitle: (asset: TAsset) => string;
    renderSubtitle: (asset: TAsset) => string;
    renderBodyMarkdown: (asset: TAsset) => string;
}) {
    return (
        <section className='space-y-3'>
            <div className='flex items-center justify-between gap-3'>
                <h4 className='text-sm font-semibold'>{title}</h4>
                <span className='text-muted-foreground text-xs'>{assets.length} items</span>
            </div>
            {assets.length > 0 ? (
                <div className='grid gap-3 xl:grid-cols-2'>
                    {assets.map((asset) => (
                        <AssetCard
                            key={asset.id}
                            asset={asset}
                            title={renderTitle(asset)}
                            subtitle={renderSubtitle(asset)}
                            bodyMarkdown={renderBodyMarkdown(asset)}
                        />
                    ))}
                </div>
            ) : (
                <p className='text-muted-foreground text-sm'>{emptyLabel}</p>
            )}
        </section>
    );
}

function SummaryCard({ label, value, detail }: { label: string; value: string; detail: string }) {
    return (
        <div className='border-border bg-card rounded-2xl border px-4 py-3 shadow-sm'>
            <p className='text-muted-foreground text-[11px] font-semibold tracking-[0.12em] uppercase'>{label}</p>
            <p className='mt-2 text-sm font-semibold'>{value}</p>
            <p className='text-muted-foreground mt-1 text-xs'>{detail}</p>
        </div>
    );
}

export function RegistrySettingsView({ profileId }: RegistrySettingsViewProps) {
    const utils = trpc.useUtils();
    const [selectedWorkspaceFingerprint, setSelectedWorkspaceFingerprint] = useState<string | undefined>(undefined);
    const [skillQuery, setSkillQuery] = useState('');

    const workspaceRootsQuery = trpc.runtime.listWorkspaceRoots.useQuery(
        { profileId },
        { refetchOnWindowFocus: false }
    );
    const registryQuery = trpc.registry.listResolved.useQuery(
        {
            profileId,
            ...(selectedWorkspaceFingerprint ? { workspaceFingerprint: selectedWorkspaceFingerprint } : {}),
        },
        { refetchOnWindowFocus: false }
    );
    const skillSearchQuery = trpc.registry.searchSkills.useQuery(
        {
            profileId,
            query: skillQuery.trim(),
            ...(selectedWorkspaceFingerprint ? { workspaceFingerprint: selectedWorkspaceFingerprint } : {}),
        },
        {
            enabled: skillQuery.trim().length > 0,
            refetchOnWindowFocus: false,
        }
    );
    const refreshMutation = trpc.registry.refresh.useMutation({
        onSuccess: async () => {
            await Promise.all([
                utils.registry.listResolved.invalidate(),
                utils.registry.searchSkills.invalidate(),
                utils.mode.list.invalidate(),
                utils.mode.getActive.invalidate(),
                utils.runtime.getShellBootstrap.invalidate({ profileId }),
            ]);
        },
    });

    const workspaceRoots = workspaceRootsQuery.data?.workspaceRoots ?? [];

    useEffect(() => {
        if (!selectedWorkspaceFingerprint) {
            return;
        }

        if (workspaceRoots.some((workspaceRoot) => workspaceRoot.fingerprint === selectedWorkspaceFingerprint)) {
            return;
        }

        setSelectedWorkspaceFingerprint(undefined);
    }, [selectedWorkspaceFingerprint, workspaceRoots]);

    const resolvedAgentModes =
        registryQuery.data?.resolved.modes.filter((mode) => mode.topLevelTab === 'agent') ?? [];
    const selectedWorkspaceRoot = selectedWorkspaceFingerprint
        ? workspaceRoots.find((workspaceRoot) => workspaceRoot.fingerprint === selectedWorkspaceFingerprint)
        : undefined;
    const skillMatches = skillSearchQuery.data?.skillfiles ?? [];

    return (
        <section className='min-h-full space-y-5 p-4'>
            <div className='flex flex-wrap items-start justify-between gap-3'>
                <div className='max-w-3xl space-y-1'>
                    <h4 className='text-base font-semibold'>Agent Registry</h4>
                    <p className='text-muted-foreground text-sm leading-6'>
                        Refresh file-backed rules, skills, and custom agent modes from the global runtime asset root or a
                        selected workspace. Registry resolution is explicit and backend-owned in this slice.
                    </p>
                </div>
                <div className='flex flex-wrap gap-2'>
                    <Button
                        type='button'
                        size='sm'
                        variant='outline'
                        disabled={refreshMutation.isPending}
                        onClick={() => {
                            void refreshMutation.mutateAsync({ profileId });
                        }}>
                        Refresh Global
                    </Button>
                    <Button
                        type='button'
                        size='sm'
                        variant='outline'
                        disabled={refreshMutation.isPending || !selectedWorkspaceFingerprint}
                        onClick={() => {
                            if (!selectedWorkspaceFingerprint) {
                                return;
                            }

                            void refreshMutation.mutateAsync({
                                profileId,
                                workspaceFingerprint: selectedWorkspaceFingerprint,
                            });
                        }}>
                        Refresh Workspace
                    </Button>
                </div>
            </div>

            <div className='grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]'>
                <div className='border-border bg-card rounded-2xl border p-4 shadow-sm'>
                    <p className='text-muted-foreground text-[11px] font-semibold tracking-[0.12em] uppercase'>Roots</p>
                    <div className='mt-3 space-y-3'>
                        <div>
                            <p className='text-sm font-semibold'>Global asset root</p>
                            <p className='text-muted-foreground mt-1 break-all text-xs'>
                                {registryQuery.data?.paths.globalAssetsRoot ?? 'Loading...'}
                            </p>
                        </div>
                        <div>
                            <label className='text-sm font-semibold' htmlFor='registry-workspace-select'>
                                Workspace context
                            </label>
                            <select
                                id='registry-workspace-select'
                                className='border-border bg-background mt-2 h-10 w-full rounded-xl border px-3 text-sm'
                                value={selectedWorkspaceFingerprint ?? ''}
                                onChange={(event) => {
                                    const nextValue = event.target.value.trim();
                                    setSelectedWorkspaceFingerprint(nextValue.length > 0 ? nextValue : undefined);
                                }}>
                                <option value=''>No workspace selected</option>
                                {workspaceRoots.map((workspaceRoot) => (
                                    <option key={workspaceRoot.fingerprint} value={workspaceRoot.fingerprint}>
                                        {workspaceRoot.label}
                                    </option>
                                ))}
                            </select>
                            <p className='text-muted-foreground mt-2 break-all text-xs'>
                                {selectedWorkspaceRoot
                                    ? selectedWorkspaceRoot.absolutePath
                                    : 'Select a workspace to inspect workspace-scoped assets.'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className='grid gap-3 sm:grid-cols-3 lg:grid-cols-1'>
                    <SummaryCard
                        label='Resolved Modes'
                        value={String(resolvedAgentModes.length)}
                        detail='Agent-only modes after precedence resolution'
                    />
                    <SummaryCard
                        label='Resolved Rules'
                        value={String(registryQuery.data?.resolved.rulesets.length ?? 0)}
                        detail='Rulesets available to workspace-aware agent flows'
                    />
                    <SummaryCard
                        label='Resolved Skills'
                        value={String(registryQuery.data?.resolved.skillfiles.length ?? 0)}
                        detail='Searchable skills after scope and precedence filtering'
                    />
                </div>
            </div>

            <div className='border-border bg-card rounded-2xl border p-4 shadow-sm'>
                <label className='text-sm font-semibold' htmlFor='registry-skill-search'>
                    Skill Search
                </label>
                <input
                    id='registry-skill-search'
                    type='text'
                    value={skillQuery}
                    onChange={(event) => {
                        setSkillQuery(event.target.value);
                    }}
                    className='border-border bg-background mt-2 h-10 w-full rounded-xl border px-3 text-sm'
                    placeholder='Search by skill name, description, or tag'
                />
                {skillQuery.trim().length > 0 ? (
                    <div className='mt-4 space-y-3'>
                        <div className='flex items-center justify-between gap-3'>
                            <p className='text-sm font-semibold'>Matches</p>
                            <span className='text-muted-foreground text-xs'>{skillMatches.length} skills</span>
                        </div>
                        {skillMatches.length > 0 ? (
                            <div className='grid gap-3 xl:grid-cols-2'>
                                {skillMatches.map((skillfile) => (
                                    <AssetCard
                                        key={skillfile.id}
                                        asset={skillfile}
                                        title={skillfile.name}
                                        subtitle={skillfile.assetKey}
                                        bodyMarkdown={skillfile.bodyMarkdown}
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className='text-muted-foreground text-sm'>No skills matched that query.</p>
                        )}
                    </div>
                ) : null}
            </div>

            <AssetSection
                title='Resolved Agent Modes'
                emptyLabel='No resolved agent modes are available yet.'
                assets={resolvedAgentModes}
                renderTitle={(asset) => asset.label}
                renderSubtitle={(asset) => `${asset.modeKey} · ${asset.assetKey}`}
                renderBodyMarkdown={(asset) => String(asset.prompt.instructionsMarkdown ?? '')}
            />

            <AssetSection
                title='Resolved Rulesets'
                emptyLabel='No resolved rulesets are available yet.'
                assets={registryQuery.data?.resolved.rulesets ?? []}
                renderTitle={(asset) => asset.name}
                renderSubtitle={(asset) => asset.assetKey}
                renderBodyMarkdown={(asset) => asset.bodyMarkdown}
            />

            <AssetSection
                title='Resolved Skills'
                emptyLabel='No resolved skills are available yet.'
                assets={registryQuery.data?.resolved.skillfiles ?? []}
                renderTitle={(asset) => asset.name}
                renderSubtitle={(asset) => asset.assetKey}
                renderBodyMarkdown={(asset) => asset.bodyMarkdown}
            />

            <AssetSection
                title='Discovered Global Assets'
                emptyLabel='No global file-backed assets have been discovered yet.'
                assets={[
                    ...(registryQuery.data?.discovered.global.modes ?? []),
                    ...(registryQuery.data?.discovered.global.rulesets ?? []),
                    ...(registryQuery.data?.discovered.global.skillfiles ?? []),
                ]}
                renderTitle={(asset) => ('label' in asset ? asset.label : asset.name)}
                renderSubtitle={(asset) => asset.assetKey}
                renderBodyMarkdown={(asset) =>
                    'bodyMarkdown' in asset ? asset.bodyMarkdown : String(asset.prompt.instructionsMarkdown ?? '')
                }
            />

            {selectedWorkspaceFingerprint ? (
                <AssetSection
                    title='Discovered Workspace Assets'
                    emptyLabel='No workspace file-backed assets have been discovered for this workspace yet.'
                    assets={[
                        ...(registryQuery.data?.discovered.workspace?.modes ?? []),
                        ...(registryQuery.data?.discovered.workspace?.rulesets ?? []),
                        ...(registryQuery.data?.discovered.workspace?.skillfiles ?? []),
                    ]}
                    renderTitle={(asset) => ('label' in asset ? asset.label : asset.name)}
                    renderSubtitle={(asset) => asset.assetKey}
                    renderBodyMarkdown={(asset) =>
                        'bodyMarkdown' in asset ? asset.bodyMarkdown : String(asset.prompt.instructionsMarkdown ?? '')
                    }
                />
            ) : null}
        </section>
    );
}
