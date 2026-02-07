import React, { useState, useEffect, useContext, useCallback } from "react";
import '@/types/global.d.ts';
import { Button } from "@el/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@el/Dialog";
import { Spinner } from "@el/Spinner";
import { SettingsDialog } from "./SettingsDialog";
import { ClassSourceList } from "./ClassSourceList";
import { ReactComponent as HelpIcon } from "@/assets/icons/helpIcon.svg";
import { ReactComponent as CogIcon } from "@/assets/icons/GearIcon.svg";
import { ReactComponent as ShadowIcon } from "@/assets/icons/ShadowIcon.svg";
import { useSaveShortcut } from "../../functions/Shortcuts";
import { formatDate } from "../../functions/Helpers";
import {
  fetchClasses,
  handleFetchedClasses,
} from "../../functions/ClassFetcher";
import { fetchCacheStatus } from "../../functions/CacheStatus";
import { fetchSettings, saveSettings } from "@functions/Settings";
import { enhanceErrorMessages } from "@functions/ErrorMapper";
import { handleSave } from "../../functions/HandleSave";
import { useEditorContext, type Settings } from "@/contexts/EditorContext";
import { WizzardContext } from "@hooks/wizzardContext";

interface CacheStatus {
  status: "completed" | "failed" | null;
  errors?: string;
  createdAt?: string;
  auto_fixed?: boolean;
}

interface ClassSource {
  name: string;
  count: number;
  classes: string[];
}

interface GroupedClassesData {
  sources: ClassSource[];
  total: number;
}

/**
 * Navigation component with save, cache status, and settings
 * Handles dark mode, license management, and plugin configuration
 * Now uses EditorContext for shared state instead of props drilling
 */
const Nav: React.FC = () => {
  // Get shared state from EditorContext
  const {
    jsContent,
    scssContent,
    jsContentRef,
    scssContentRef,
    wizzardContentRef,
    settings,
    setSettings,
    darkMode,
    setDarkMode,
    setLicenseState,
    isDataLoading,
    isProVersion,
  } = useEditorContext();

  // Get wizzard content from WizzardContext
  const { localWizzardState } = useContext(WizzardContext)!;

  const [isOpen, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [cacheInProgress, setCacheInProgress] = useState(false);
  const [cacheStatus, setCacheStatus] = useState<CacheStatus | null>(null);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [licenseProcessing, setLicenseProcessing] = useState(false);
  const [licenseError, setLicenseError] = useState<string | null>(null);
  const [groupedClasses, setGroupedClasses] = useState<GroupedClassesData | null>(null);
  const [classesLoading, setClassesLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetchSettings(setSettings, false, () => {
      if (!document.getElementById("compile-in-browser")) {
        const script = document.createElement("script");
        script.id = "compile-in-browser";
        const randomString = Math.random().toString(36).substring(2, 15);
        // Tailwind CSS compiler
        script.src = `${window.pluginUrl}build/compiler/tailwindcss-compiler.js?v=${randomString}`;
        script.async = true;
        script.onload = () => setScriptLoaded(true);
        document.body.appendChild(script);
      } else {
        setScriptLoaded(true);
      }
    }, controller.signal);

    // Check for dark mode preference in local storage
    const isDarkMode = localStorage.getItem("darkMode") === "true";
    setDarkMode(isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    }

    // Fetch cache status and check if auto-fix cleared corrupted cache
    fetchCacheStatus(setCacheStatus, controller.signal)
      .then((statusData) => {
        if (statusData?.auto_fixed) {
          // Auto-fix cleared corrupted cache, trigger recompilation
          return handleSaveAndFetchClasses();
        }
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') {
          console.error('[Nav] Auto-fix check failed:', error);
        }
      });

    return () => controller.abort();
  }, [setDarkMode, setSettings]);

  // Refetch cache status when the page becomes visible again
  useEffect(() => {
    let currentController: AbortController | null = null;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Abort any pending request before starting a new one
        currentController?.abort();
        currentController = new AbortController();
        fetchCacheStatus(setCacheStatus, currentController.signal);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Also listen for window focus as a fallback
    const handleFocus = () => {
      // Abort any pending request before starting a new one
      currentController?.abort();
      currentController = new AbortController();
      fetchCacheStatus(setCacheStatus, currentController.signal);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      currentController?.abort();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  useEffect(() => {
    if (scriptLoaded && localStorage?.getItem("_reload_cache") === "true") {
      localStorage.removeItem("_reload_cache");
      const _waitForContent = setInterval(() => {
        if (localStorage?.getItem("_content_fetched") === "true") {
          clearInterval(_waitForContent);
          localStorage.removeItem("_content_fetched");
          setTimeout(() => {
            handleSaveAndFetchClasses();
          }, 1000);
        }
      }, 100);
    }
  }, [scriptLoaded]);

  const fetchGroupedClasses = useCallback(async () => {
    setClassesLoading(true);
    try {
      const response = await fetch(
        `${window.ajaxUrl}?action=winden_get_classes_grouped`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ _nonce: window.nonce }),
        }
      );
      const result = await response.json();
      if (result.success && result.data) {
        setGroupedClasses(result.data);
      }
    } catch (error) {
      console.error('[Nav] Failed to fetch grouped classes:', error);
    } finally {
      setClassesLoading(false);
    }
  }, []);

  const openModal = useCallback(() => {
    if (cacheStatus?.status && !cacheInProgress) {
      setOpen(true);
      // Fetch grouped classes when dialog opens
      fetchGroupedClasses();
    }
  }, [cacheStatus?.status, cacheInProgress, fetchGroupedClasses]);

  const onSave = useCallback(async () => {
    wizzardContentRef.current = localWizzardState;
    await handleSave(jsContentRef, scssContentRef, wizzardContentRef, settings);
  }, [jsContentRef, scssContentRef, wizzardContentRef, settings, localWizzardState]);

  const handleSaveAndFetchClasses = useCallback(async () => {
    setLoading(true);
    wizzardContentRef.current = localWizzardState;
    await handleSave(jsContentRef, scssContentRef, wizzardContentRef, settings);
    setLoading(false);
    // Always use v4
    fetchClasses(setCacheInProgress, (classes) =>
      handleFetchedClasses(
        classes,
        scriptLoaded,
        scssContentRef?.current ?? scssContent,
        jsContent,
        setCacheInProgress,
        fetchCacheStatus,
        setCacheStatus,
        wizzardContentRef,
        localWizzardState,
        settings?.css_preprocessor || "css",
        "v4"
      )
    );
  }, [jsContentRef, scssContentRef, wizzardContentRef, settings, scriptLoaded, scssContent, jsContent, localWizzardState]);

  useSaveShortcut(
    handleSaveAndFetchClasses,
    jsContentRef,
    scssContentRef,
    wizzardContentRef,
    isDataLoading
  );

  const toggleDarkMode = useCallback(() => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    if (newDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("darkMode", String(newDarkMode));
  }, [darkMode, setDarkMode]);

  const toggleSettingsModal = useCallback(() => setSettingsOpen(prev => !prev), []);

  const handleChange = useCallback((settingName: keyof Settings) => (value: Settings[keyof Settings]) => {
    // Use functional update to avoid stale closure when multiple settings change at once
    setSettings(prev => {
      const newSettings = { ...prev, [settingName]: value };
      saveSettings(newSettings);
      return newSettings;
    });
  }, [setSettings]);

  async function deactivateLicense() {
    setLicenseProcessing(true);
    setLicenseError(null);
    const response = await fetch(
      `${window.ajaxUrl}?action=update_license`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "deactivate",
          _nonce: window.nonce,
        }),
      }
    );

    const result = await response.json();
    if (result.success) {
      setLicenseState(false);
    } else {
      console.error("Error deactivating license:", result.data);
      setLicenseError(result.data);
    }
    setLicenseProcessing(false);
  }

  return (
    <>
      <nav className="flex gap-2 items-center">
        {cacheInProgress ? (
          <Button variant="outline">
            <Spinner />
            Caching
          </Button>
        ) : cacheStatus?.status === "completed" ? (
          <Button variant="outline" onClick={openModal}>
            Cached
          </Button>
        ) : cacheStatus?.status === "failed" ? (
          <Button
            variant="outline"
            className="!border-[#991b1b] !gap-1 !border-[1px] !shadow-none !border-solid !text-[#991b1b] !bg-[#fef2f2]"
            onClick={openModal}
          >
            Cache Error
            <HelpIcon style={{ width: '18px', height: '18px' }} />
          </Button>
        ) : (
          <Button variant="outline">No Cache</Button>
        )}

        <Button
          variant="default"
          onClick={handleSaveAndFetchClasses}
          disabled={loading || isDataLoading}
        >
          {loading || isDataLoading ? "Loading..." : "Save"}
        </Button>

        <Button
          variant="ghost"
          icon={<CogIcon />}
          onClick={toggleSettingsModal}
        ></Button>

        <Button variant="ghost" icon={<ShadowIcon />} onClick={toggleDarkMode} />
      </nav>
      <Dialog open={isOpen} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {cacheStatus?.status === "completed"
                ? "Cache Success"
                : cacheStatus?.status === "failed"
                ? "Cache Error"
                : "Cache"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Cache compilation status and error details
            </DialogDescription>
          </DialogHeader>
          {cacheStatus?.status === "completed" ? (
            <>
              <Button
                variant="default"
                onClick={() => window.open(`${window.uploadUrl}/winden/output.css?t=${Date.now()}`, '_blank')}
              >
                View cache ↗
              </Button>
              <ClassSourceList
                sources={groupedClasses?.sources || []}
                total={groupedClasses?.total || 0}
                isLoading={classesLoading}
              />
            </>
          ) : null}

          {cacheStatus?.status === "failed" && cacheStatus?.errors?.length && (
            <>
              {(() => {
                const rawErrors = JSON.parse(cacheStatus?.errors);
                const enhancedErrors = enhanceErrorMessages(rawErrors);
                return enhancedErrors?.length
                  ? enhancedErrors.map((error: any, idx: number) => (
                      <div
                        key={idx}
                        className="mt-5 flex bg-red-100 rounded-lg p-4 mb-4 text-sm cache-message cache-error"
                        role="alert"
                      >
                        <svg
                          className="w-5 h-5 inline mr-3 shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                            clipRule="evenodd"
                          ></path>
                        </svg>
                        <div className="flex flex-col gap-2 flex-1">
                          <span className="font-medium">
                            {error?.title || "Error"}
                          </span>
                          {error.tabName && error.lineInTab && (
                            <div className="text-xs bg-red-200 px-2 py-1 rounded inline-block w-fit">
                              📍 Tab: <strong>{error.tabName}</strong>, Line: <strong>{error.lineInTab}</strong>
                            </div>
                          )}
                          <pre className="cache-error-form whitespace-pre-wrap">
                            {error?.message || "Something went wrong"}
                          </pre>
                          {error.context && (
                            <div className="mt-2 bg-red-50 p-2 rounded border border-red-200">
                              <div className="text-xs font-medium mb-1">Code:</div>
                              <code className="text-xs">{error.context}</code>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  : null;
              })()}
            </>
          )}
          {cacheStatus?.createdAt && (
            <div className="mt-5 font-medium">
              Created: {formatDate(cacheStatus.createdAt)}
            </div>
          )}
        </DialogContent>
      </Dialog>
      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={toggleSettingsModal}
        settings={settings}
        onSettingChange={handleChange}
        licenseProcessing={licenseProcessing}
        licenseError={licenseError}
        onDeactivateLicense={deactivateLicense}
        isProVersion={isProVersion}
      />
    </>
  );
};

export default Nav;
