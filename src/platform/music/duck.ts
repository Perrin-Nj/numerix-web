type Fn = (ducked: boolean) => void;
let ducked = false;
const subs = new Set<Fn>();

/** Voice clips call this so the music steps down while someone is talking. */
export function setDucked(v: boolean) {
  if (v === ducked) return;
  ducked = v;
  subs.forEach((f) => f(v));
}
/** True while a voice clip is playing. */
export const isDucked = () => ducked;
/** Subscribe to duck changes; returns the unsubscribe function. */
export function onDuck(f: Fn) {
  subs.add(f);
  return () => void subs.delete(f);
}
