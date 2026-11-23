// Every espace seed question routed to its scene (stories, evidence script, review harness). A snapshot of the seed (seed.json, regenerated from the content repo).
import { routeQuestion, type RawQuestion } from '../../route';
import type { PilotScene } from '../../fixtures/pilot';
import seed from './seed.json';

export const ESPACE_SCENES: PilotScene[] = (seed as unknown as RawQuestion[])
  .map((q) => routeQuestion('espace', q))
  .filter((r): r is PilotScene => !('skip' in r));
