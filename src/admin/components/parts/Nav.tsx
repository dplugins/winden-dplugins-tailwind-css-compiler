import React, { useState, useEffect } from "react";
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
import type { WizzardState } from "@/types/wizzard";
import { enhanceErrorMessages, formatEnhancedError } from "@functions/ErrorMapper";

interface CacheStatus {
  status: "completed" | "failed" | null;
  errors?: string;
  createdAt?: string;
  auto_fixed?: boolean;
}

interface Settings {
  autocomplete_gutenberg?: boolean;
  autocomplete_bricks?: boolean;
  autocomplete_oxygen?: boolean;
  autocomplete_oxygen6?: boolean;
  autocomplete_elementor?: boolean;
  dequeue_styles_gutenberg?: boolean;
  dequeue_styles_bricks?: boolean;
  dequeue_styles_oxygen?: boolean;
  register_wizzard_data_in_fse?: boolean;
  disable_dev_mode?: boolean;
  inline_compiled_css?: boolean;
  css_preprocessor?: "css" | "scss";
  folded_sidebar?: boolean;
  scan_file_formats?: string[];
  scan_path?: string | string[];
}

interface NavProps {
  /** Function to save content */
  onSave: () => Promise<void>;
  /** Reference to JS content */
  jsContentRef: React.MutableRefObject<string>;
  /** Reference to SCSS content */
  scssContentRef: React.MutableRefObject<string>;
  /** Current JS content */
  jsContent: string;
  /** Current SCSS content */
  scssContent: string;
  /** Dark mode state */
  darkMode: boolean;
  /** Function to toggle dark mode */
  setDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
  /** Reference to wizzard content */
  wizzardContentRef: React.MutableRefObject<WizzardState | null>;
  /** Current wizzard content */
  wizzardContent: WizzardState | null;
  /** Function to update license state */
  setLicenseState: React.Dispatch<React.SetStateAction<boolean>>;
  /** Application settings */
  settings: Settings;
  /** Function to update settings */
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  /** Loading state */
  isDataLoading: boolean;
  /** Whether pro folder exists */
  isProVersion: boolean;
}

/**
 * Navigation component with save, cache status, and settings
 * Handles dark mode, license management, and plugin configuration
 */
const Nav: React.FC<NavProps> = ({
  onSave,
  jsContentRef,
  scssContentRef,
  jsContent,
  scssContent,
  darkMode,
  setDarkMode,
  wizzardContentRef,
  wizzardContent,
  setLicenseState,
  settings,
  setSettings,
  isDataLoading,
  isProVersion,
}) => {
  const [isOpen, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [cacheInProgress, setCacheInProgress] = useState(false);
  const [cacheStatus, setCacheStatus] = useState<CacheStatus | null>(null);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [fileFormats, setFileFormats] = useState<string[]>([]);
  const [licenseProcessing, setLicenseProcessing] = useState(false);
  const [licenseError, setLicenseError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings(setSettings, false, (_settings) => {
      if (!document.getElementById("compile-in-browser")) {
        const script = document.createElement("script");
        script.id = "compile-in-browser";
        const randomString = Math.random().toString(36).substring(2, 15);
        // Tailwind CSS compiler
        script.src = `${(window as any).pluginUrl}build/compiler/tailwindcss-compiler.js?v=${randomString}`;
        script.async = true;
        script.onload = () => setScriptLoaded(true);
        document.body.appendChild(script);
      } else {
        setScriptLoaded(true);
      }
    });

    // Check for dark mode preference in local storage
    const isDarkMode = localStorage.getItem("darkMode") === "true";
    setDarkMode(isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    }

    // Fetch cache status and check if auto-fix cleared corrupted cache
    fetchCacheStatus(setCacheStatus)
      .then((statusData) => {
        if (statusData?.auto_fixed) {
          // Auto-fix cleared corrupted cache, trigger recompilation
          return handleSaveAndFetchClasses();
        }
      })
      .catch((error) => {
        console.error('[Nav] Auto-fix check failed:', error);
      });
  }, [setDarkMode, setSettings]);

  // Refetch cache status when the page becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Refetch cache status when user comes back to the page
        fetchCacheStatus(setCacheStatus);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Also listen for window focus as a fallback
    const handleFocus = () => {
      fetchCacheStatus(setCacheStatus);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
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

  const openModal = () => {
    if (cacheStatus?.status && !cacheInProgress) {
      setOpen(true);
    }
  };
  const closeModal = () => setOpen(false);

  const handleSaveAndFetchClasses = async (newSettings: Settings | null = null) => {
    setLoading(true);
    await onSave();
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
        wizzardContent,
        settings?.css_preprocessor || "css",
        "v4"
      )
    );
  };

  useSaveShortcut(
    handleSaveAndFetchClasses,
    jsContentRef,
    scssContentRef,
    wizzardContentRef,
    isDataLoading
  );

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    if (newDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("darkMode", String(newDarkMode));
  };

  const toggleSettingsModal = () => setSettingsOpen(!isSettingsOpen);

  const handleChange = (settingName: keyof Settings) => (value: any) => {
    const newSettings = { ...settings, [settingName]: value };
    setSettings(newSettings);
    saveSettings(newSettings);

    // Note: tailwind_version is always v4 now, no config refresh needed
  };

  async function dectivateLicense() {
    setLicenseProcessing(true);
    setLicenseError(null);
    const response = await fetch(
      `${(window as any).ajaxUrl}?action=update_license`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "deactivate",
          _nonce: (window as any).nonce,
        }),
      }
    );

    const result = await response.json();
    if (result.success) {
      setLicenseState(false);
    } else {
      console.error("Error dectivating license:", result.data);
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
            <a href={`${(window as any).uploadUrl}/winden/output.css?t=${Date.now()}`} target="_blank">
              View cache ↗
            </a>
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
        onDeactivateLicense={dectivateLicense}
        isProVersion={isProVersion}
      />
    </>
  );
};

export default Nav;
