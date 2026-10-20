export type MusicState = {
  /** The child's switch. */
  music: boolean;
  /** The parent's lock: music stays off whatever the child chose. */
  locked: boolean;
  /** The app-wide sound switch (parent's `sound` setting). */
  soundOn: boolean;
  /** True after the first tap: browsers and the brief forbid sound before it. */
  unlocked: boolean;
  visible: boolean;
  /** Data saver: no music download at all. */
  saveData: boolean;
};

/** The single rule for "music may be heard now". No audio request is ever made when this is false. */
export function shouldPlay(s: MusicState): boolean {
  return s.music && !s.locked && s.soundOn && s.unlocked && s.visible && !s.saveData;
}
