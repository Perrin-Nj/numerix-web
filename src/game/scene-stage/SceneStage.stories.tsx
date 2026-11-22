import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { SceneStage } from './SceneStage';
import { PILOT_SCENES, echecsCases004, espaceHorloge001, medecineDoses001, type PilotScene } from './fixtures/pilot';
import { ALL_BY_ID, SAMPLES, espaceClockApproach, espaceClockDocked } from './fixtures';
import type { StagePhase } from './registry';

function Frame({ p, phase, lang = 'fr', tier }: { p: PilotScene; phase: StagePhase; lang?: 'fr' | 'en'; tier?: 'full' | 'lite' }) {
  return (
    <div className="h-[260px] w-full max-w-xl overflow-hidden rounded-lg shadow-2 sm:h-[320px]" data-testid={`${p.id}-${phase}`}>
      <SceneStage spec={p.spec} source={p[lang]} phase={phase} tier={tier} />
    </div>
  );
}

const meta = {
  title: 'game/SceneStage',
  component: SceneStage,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof SceneStage>;
export default meta;
type Story = StoryObj<typeof meta>;
const one = (p: PilotScene, phase: StagePhase): Story => ({ args: { spec: p.spec, source: p.fr }, render: () => <Frame p={p} phase={phase} /> });

export const EspaceClock: Story = one(espaceHorloge001, 'question');
export const EspaceClockRight: Story = one(espaceHorloge001, 'ok');
export const EspaceClockGentleMiss: Story = one(espaceHorloge001, 'ko');
export const EchecsRow: Story = one(echecsCases004, 'question');
export const EchecsRowRight: Story = one(echecsCases004, 'ok');
export const EchecsRowGentleMiss: Story = one(echecsCases004, 'ko');
export const MedecineDose: Story = one(medecineDoses001, 'question');
export const MedecineDoseRight: Story = one(medecineDoses001, 'ok');
export const MedecineDoseGentleMiss: Story = one(medecineDoses001, 'ko');

export const AllPilots: Story = {
  args: { spec: espaceHorloge001.spec, source: espaceHorloge001.fr },
  render: () => (
    <div className="grid gap-4 md:grid-cols-3">
      {PILOT_SCENES.map((p) => (
        <Frame key={p.id} p={p} phase="question" />
      ))}
    </div>
  ),
};
export const English: Story = { args: { spec: espaceHorloge001.spec, source: espaceHorloge001.en }, render: () => <Frame p={medecineDoses001} phase="question" lang="en" />, globals: { locale: 'en-CA' } };
export const French: Story = { args: { spec: espaceHorloge001.spec, source: espaceHorloge001.fr }, render: () => <Frame p={medecineDoses001} phase="question" lang="fr" />, globals: { locale: 'fr-CA' } };
export const Dark: Story = { ...one(echecsCases004, 'question'), globals: { theme: 'dark' } };
export const HighContrast: Story = { ...one(medecineDoses001, 'question'), globals: { theme: 'hc' } };
export const ReducedMotion: Story = { ...one(medecineDoses001, 'ok'), globals: { motion: 'reduced' } };
export const LiteTier: Story = { args: { spec: echecsCases004.spec, source: echecsCases004.fr }, render: () => <Frame p={echecsCases004} phase="question" tier="lite" /> };
export const TvScale: Story = { ...one(espaceHorloge001, 'question'), globals: { display: 'tv' } };

/** Question, then the answer: the way the play screen drives the stage. Used by scripts/play-scenes.mjs. */
function Playground({ p }: { p: PilotScene }) {
  const [phase, setPhase] = useState<StagePhase>('question');
  return (
    <div className="flex max-w-xl flex-col gap-2">
      <div className="h-[260px] w-full overflow-hidden rounded-lg shadow-2 sm:h-[320px]" data-testid="stage-box">
        <SceneStage spec={p.spec} source={p.fr} phase={phase} />
      </div>
      <div className="flex gap-2">
        {(['question', 'ok', 'ko'] as const).map((ph) => (
          <button key={ph} type="button" data-phase-btn={ph} onClick={() => setPhase(ph)} className="min-h-11 rounded-md border border-line-strong px-3">
            {ph}
          </button>
        ))}
      </div>
    </div>
  );
}
/** First pilot: control room, wall clock (2:05), cargo rocket approaching the station. */
export const FirstPilotApproach: Story = one(espaceClockApproach, 'question');
export const FirstPilotApproachRight: Story = one(espaceClockApproach, 'ok');
export const FirstPilotApproachGentleMiss: Story = one(espaceClockApproach, 'ko');
export const ControlRoomDocked: Story = one(espaceClockDocked, 'question');
export const EchecsGrid: Story = one(SAMPLES.echecsGrid, 'question');
export const EchecsGridRight: Story = one(SAMPLES.echecsGrid, 'ok');
export const EchecsGridGentleMiss: Story = one(SAMPLES.echecsGrid, 'ko');
export const EchecsBars: Story = one(SAMPLES.echecsBars, 'question');
export const EchecsPictograph: Story = one(SAMPLES.echecsPicto, 'question');
export const MedecineMat: Story = one(SAMPLES.medGrid, 'question');
export const MedecineMatRight: Story = one(SAMPLES.medGrid, 'ok');
export const MedecineShelf: Story = one(SAMPLES.medBars, 'question');
export const MedecineShelfGentleMiss: Story = one(SAMPLES.medBars, 'ko');
export const ClinicClock: Story = one(SAMPLES.medClock, 'question');
export const SkyCount: Story = one(SAMPLES.spaceSky, 'question');
export const SkyCountRight: Story = one(SAMPLES.spaceSky, 'ok');
export const StarMap: Story = one(SAMPLES.spaceGrid, 'question');
export const PlaygroundEspace: Story = { args: { spec: espaceHorloge001.spec, source: espaceHorloge001.fr }, render: () => <Playground p={espaceHorloge001} /> };
export const PlaygroundEchecs: Story = { args: { spec: echecsCases004.spec, source: echecsCases004.fr }, render: () => <Playground p={echecsCases004} /> };
export const PlaygroundMedecine: Story = { args: { spec: medecineDoses001.spec, source: medecineDoses001.fr }, render: () => <Playground p={medecineDoses001} /> };

/** Review harness: any scene by id and language, sized like the play screen stage. Driven by scripts/play-scenes.mjs (?args=sceneId:espace_horloge_001;lang:fr, dots written as underscores because Storybook URL args allow no dots). */
export const Review: Story = {
  args: { spec: espaceHorloge001.spec, source: espaceHorloge001.fr, sceneId: 'espace_horloge_001', lang: 'fr', tier: 'full' } as never,
  argTypes: { sceneId: { control: 'text' }, lang: { control: 'radio', options: ['fr', 'en'] } } as never,
  render: (args) => {
    const a = args as unknown as { sceneId?: string; lang?: 'fr' | 'en'; tier?: 'full' | 'lite' };
    const p = ALL_BY_ID[(a.sceneId ?? espaceClockApproach.id).replace(/_/g, '.')] ?? espaceClockApproach;
    return <ReviewBox p={p} lang={a.lang ?? 'fr'} tier={a.tier ?? 'full'} />;
  },
};
function ReviewBox({ p, lang, tier }: { p: PilotScene; lang: 'fr' | 'en'; tier: 'full' | 'lite' }) {
  const [phase, setPhase] = useState<StagePhase>('question');
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="w-full overflow-hidden rounded-lg shadow-2" style={{ height: 'clamp(120px, 34svh, 420px)' }} data-testid="stage-box">
        <SceneStage spec={p.spec} source={p[lang]} phase={phase} tier={tier} />
      </div>
      <div className="flex gap-2">
        {(['question', 'ok', 'ko'] as const).map((ph) => (
          <button key={ph} type="button" data-phase-btn={ph} onClick={() => setPhase(ph)} className="min-h-11 rounded-md border border-line-strong px-3">
            {ph}
          </button>
        ))}
      </div>
    </div>
  );
}
