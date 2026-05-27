import { useEffect, useRef } from 'react';
import type { WizzardState } from '@/types/wizzard';

/**
 * Browser-level "you have unsaved changes" guard.
 *
 * Maintains a baseline of the last-saved state and compares it against
 * the live editor state. While dirty, a `beforeunload` listener trips
 * the browser's native "Leave site?" confirm — covering both tab close
 * AND in-WP navigation (e.g. clicking Posts in the sidebar).
 *
 * Baseline refreshes when:
 *   - `contentData` first loads (initial fetch)
 *   - HandleSave dispatches `winden:save-success` (successful save)
 *
 * In-Winden tab switches (Style ↔ Config ↔ Wizzard ↔ Style Guide) don't
 * lose data and are intentionally not guarded.
 *
 * See dplugins/winden-pro#13.
 */
export function useUnsavedChangesGuard(params: {
    jsContent: string;
    scssContent: string;
    wizzard: WizzardState | null;
    contentLoaded: boolean;
}) {
    const { jsContent, scssContent, wizzard, contentLoaded } = params;

    const baselineRef = useRef<{ js: string; scss: string; wizzard: string } | null>(null);

    // Initialise / refresh baseline. Done on initial load and on save.
    useEffect(() => {
        if (!contentLoaded) return;
        if (baselineRef.current === null) {
            baselineRef.current = {
                js: jsContent,
                scss: scssContent,
                wizzard: JSON.stringify(wizzard ?? null),
            };
        }
    }, [contentLoaded, jsContent, scssContent, wizzard]);

    useEffect(() => {
        function onSaveSuccess() {
            baselineRef.current = {
                js: jsContent,
                scss: scssContent,
                wizzard: JSON.stringify(wizzard ?? null),
            };
        }
        window.addEventListener('winden:save-success', onSaveSuccess);
        return () => window.removeEventListener('winden:save-success', onSaveSuccess);
    }, [jsContent, scssContent, wizzard]);

    useEffect(() => {
        function handleBeforeUnload(e: BeforeUnloadEvent) {
            const baseline = baselineRef.current;
            if (!baseline) return;
            const dirty =
                baseline.js !== jsContent ||
                baseline.scss !== scssContent ||
                baseline.wizzard !== JSON.stringify(wizzard ?? null);
            if (dirty) {
                // Modern browsers ignore the message string and show their
                // own canned text; we still need preventDefault + returnValue
                // for the prompt to appear.
                e.preventDefault();
                e.returnValue = '';
            }
        }
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [jsContent, scssContent, wizzard]);
}
