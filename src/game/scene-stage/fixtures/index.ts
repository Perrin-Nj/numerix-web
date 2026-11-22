import { espaceClockApproach, espaceClockDocked } from './espace-clock';
import { PILOT_SCENES, type PilotScene } from './pilot';
import { SAMPLES } from './samples';

/** Every authored or routed sample scene, first pilot first. Stories, the evidence script and the review harness look scenes up here by id. */
export const ALL_SCENES: PilotScene[] = [espaceClockApproach, espaceClockDocked, ...PILOT_SCENES, ...Object.values(SAMPLES)];
export const ALL_BY_ID: Record<string, PilotScene> = Object.fromEntries(ALL_SCENES.map((p) => [p.id, p]));
export { SAMPLES, espaceClockApproach, espaceClockDocked };
