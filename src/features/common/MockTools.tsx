'use client';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { appConfig } from '@/config/app';
import { DevToolbar } from '@/ui/dev-toolbar';

function readScenario() {
  if (typeof document === 'undefined') return 'none';
  return /(?:^|; )nx_mock_scenario=([^;]*)/.exec(document.cookie)?.[1] ?? 'none';
}

/** Demo-data badge and failure scenarios. Rendered only while the app runs against the mock. */
export function MockTools() {
  const [scenario, setScenario] = useState(readScenario);
  const pathname = usePathname();
  const hasNav = /^\/play\/(home|worlds|journey|collection|quest|me)/.test(pathname);
  if (!appConfig.useMock) return null;
  return (
    <DevToolbar
      placement={hasNav ? 'above-nav' : 'bottom'}
      scenario={scenario}
      onScenarioChange={(value) => {
        setScenario(value);
        document.cookie =
          value === 'none'
            ? 'nx_mock_scenario=; path=/; max-age=0'
            : `nx_mock_scenario=${value}; path=/; max-age=86400; samesite=lax`;
      }}
    />
  );
}
