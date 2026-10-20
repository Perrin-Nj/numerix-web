import credits from '../../../public/music/credits.json';

export type Track = { id: string; file: string; title: string; artist: string; licence: string; licence_url: string; source_url: string };
/** The shipped tracks, straight from public/music/credits.json (also the source of the Credits page). */
export const TRACKS: Track[] = credits;
/** Where the loops are served from. */
export const MUSIC_BASE = '/music/';
