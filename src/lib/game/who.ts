'use client';
import { useEffect, useState } from 'react';

const key = (id: string) => `nx:child:${id}:profile`;
export type KidProfile = { name: string; avatar: string };

/** The kid's first name and avatar stay on this device so greetings and the Me page can use them (cookies are httpOnly). */
export function rememberChild(id: string, name: string, avatar: string) {
  try {
    localStorage.setItem(key(id), JSON.stringify({ name: name.trim().split(' ')[0] ?? '', avatar }));
  } catch {
    /* storage can be blocked; screens just go without it */
  }
}

/** undefined while reading, null when nothing is stored. */
export function useChildProfile(id: string | null): KidProfile | null | undefined {
  const [profile, setProfile] = useState<KidProfile | null | undefined>(undefined);
  // Storage exists only on the client, so it is read after mount
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!id) return setProfile(null);
    try {
      const raw = localStorage.getItem(key(id));
      setProfile(raw ? (JSON.parse(raw) as KidProfile) : null);
    } catch {
      setProfile(null);
    }
  }, [id]);
  /* eslint-enable react-hooks/set-state-in-effect */
  return profile;
}

export const useChildName = (id: string | null) => {
  const p = useChildProfile(id);
  return p === undefined ? undefined : (p?.name ?? null);
};
