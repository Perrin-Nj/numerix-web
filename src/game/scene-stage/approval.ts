import approved from './scene-approved.json';

/** A scene renders only when the flag is on AND the question id is approved. qaAll (server QA_SCENES_ALL, honoured only with QA_RENDER_AUDIT) bypasses the list. */
export function sceneApproved(id: string | undefined, flagOn: boolean, qaAll = false, list: readonly string[] = approved): boolean {
  if (!flagOn) return false;
  return qaAll || (!!id && list.includes(id));
}
