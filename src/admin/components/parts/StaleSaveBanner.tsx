import React, { useEffect, useState } from 'react';
import { Button } from '@el/Button';

/**
 * Banner rendered when HandleSave detects a stale-write conflict
 * (another tab / writer saved between this tab's fetch and save).
 * Replaces the old blocking alert(). No auto-dismiss — the user must
 * explicitly resolve. See #4.
 *
 * Two actions:
 *   - Apply my changes: fire winden:apply-stale-save so Nav.tsx re-runs
 *     handleSaveAndFetchClasses. The previous save already updated the
 *     in-memory stale-guard timestamp to the server's value, so this
 *     retry passes the check and overwrites the other writer's payload.
 *   - Reload (lose changes): full page reload — escape hatch.
 */

interface StalePending {
  javascript: string;
  scss: string;
  wizzard: unknown;
  serverUpdatedAt: string | null;
  clientUpdatedAt: string | null;
  capturedAt: string;
}

export const StaleSaveBanner: React.FC = () => {
  const [pending, setPending] = useState<StalePending | null>(null);

  useEffect(() => {
    function onStale(e: Event) {
      const ce = e as CustomEvent<{ pending: StalePending }>;
      if (ce.detail?.pending) {
        setPending(ce.detail.pending);
      }
    }
    window.addEventListener('winden:stale-write', onStale as EventListener);
    return () => {
      window.removeEventListener('winden:stale-write', onStale as EventListener);
    };
  }, []);

  if (!pending) return null;

  const handleApply = () => {
    window.dispatchEvent(new CustomEvent('winden:apply-stale-save'));
    // Optimistic dismiss. If the retry hits another stale-write, HandleSave
    // will dispatch winden:stale-write again and the banner reopens.
    setPending(null);
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex flex-wrap items-center justify-between gap-3 border-b border-danger bg-danger/10 px-4 py-3 text-sm"
    >
      <div className="min-w-0">
        <p className="font-medium text-foreground">
          Another save landed first — your changes aren't on the server yet.
        </p>
        <p className="text-foreground/70">
          Apply your changes to overwrite the latest save, or reload to start over.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="default" size="sm" onClick={handleApply}>
          Apply my changes
        </Button>
        <Button variant="outline" size="sm" onClick={handleReload}>
          Reload (lose changes)
        </Button>
      </div>
    </div>
  );
};

export default StaleSaveBanner;
