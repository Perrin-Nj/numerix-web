'use client';
import { useEffect, useState } from 'react';

type Connection = { saveData?: boolean; addEventListener?: (t: string, f: () => void) => void; removeEventListener?: (t: string, f: () => void) => void };

/** True when the device asked to save data (browser data-saver or the `prefers-reduced-data` setting). */
export function useSaveData(): boolean {
  const [save, setSave] = useState(false);
  useEffect(() => {
    const conn = (navigator as Navigator & { connection?: Connection }).connection;
    const mq = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-data: reduce)') : null;
    const read = () => setSave(Boolean(conn?.saveData) || Boolean(mq?.matches) || document.documentElement.dataset.dataSaver === 'on');
    read();
    conn?.addEventListener?.('change', read);
    mq?.addEventListener('change', read);
    return () => {
      conn?.removeEventListener?.('change', read);
      mq?.removeEventListener('change', read);
    };
  }, []);
  return save;
}
