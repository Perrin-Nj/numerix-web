'use client';
import { useEffect, useState } from 'react';

const key = (id: string) => `nx:child:${id}:name`;

/** The kid's first name stays on this device so greetings can use it (cookies are httpOnly). */
export function rememberChild(id: string, name: string) {
  try {
    localStorage.setItem(key(id), name.trim().split(' ')[0] ?? '');
  } catch {
    /* storage can be blocked; greetings just go without the name */
  }
}

export function useChildName(id: string | null): string | null {
  const [name, setName] = useState<string | null>(null);
  // Storage exists only on the client, so it is read after mount
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      setName(id ? localStorage.getItem(key(id)) || null : null);
    } catch {
      setName(null);
    }
  }, [id]);
  /* eslint-enable react-hooks/set-state-in-effect */
  return name;
}
