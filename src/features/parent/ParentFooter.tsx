'use client';
import { CreditsLink } from '@/game/credits-link';

/** Footer of every parent screen: the picture credits link, so the licence notices are one tap from any page. */
export function ParentFooter() {
  return (
    <footer className="flex justify-center border-t border-line pt-4">
      <CreditsLink />
    </footer>
  );
}
