import credits from '../../../public/music/credits.json';

export type Track = { id: string; file: string; title: string; artist: string; licence: string; licence_url: string; source_url: string };
export const TRACKS: Track[] = credits;
export const MUSIC_BASE = '/music/';
