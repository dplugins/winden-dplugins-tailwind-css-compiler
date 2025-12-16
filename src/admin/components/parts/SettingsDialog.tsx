import React from "react";
import { Button } from "@el/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@el/Dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@el/Tabs";
import { SwitchWithLabel } from "@el/SwitchWithLabel";
import { SelectWrapper } from "@el/SelectWrapper";
import { FilesScanTab } from "./FilesScanTab";

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
  register_wizzard_data_in_bricks?: boolean;
  disable_dev_mode?: boolean;
  inline_compiled_css?: boolean;
  css_preprocessor?: "css" | "scss";
  folded_sidebar?: boolean;
  scan_file_formats?: string[];
  scan_path?: string | string[];
}

interface SettingsDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback to close the dialog */
  onClose: () => void;
  /** Application settings */
  settings: Settings;
  /** Callback when a setting changes */
  onSettingChange: (settingName: keyof Settings) => (value: any) => void;
  /** Whether license is being processed */
  licenseProcessing: boolean;
  /** License error message */
  licenseError: string | null;
  /** Callback to deactivate license */
  onDeactivateLicense: () => void;
  /** Whether pro folder exists (for showing pro features) */
  isProVersion: boolean;
}

interface OptionsHeaderProps {
  title: string;
  className?: string;
}

const OptionsHeader: React.FC<OptionsHeaderProps> = ({ title, className = "" }) => (
  <h2 className={`!text-md !mt-12 !mb-6 ${className}`}>
    {title}
  </h2>
);

/**
 * Settings Dialog Component
 *
 * Manages plugin settings including:
 * - Page builder autocomplete configuration
 * - Editor preferences
 * - File scanning settings
 * - License management
 */
export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  isOpen,
  onClose,
  settings,
  onSettingChange,
  licenseProcessing,
  licenseError,
  onDeactivateLicense,
  isProVersion,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col" position="top">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription className="sr-only">
            Configure Winden plugin settings including page builders, editor preferences, file scanning, and license
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="builders" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full justify-start border-b border-border">
            <TabsTrigger value="builders">Builders</TabsTrigger>
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="production">Production</TabsTrigger>
            {isProVersion && <TabsTrigger value="files-scan">Files Scan</TabsTrigger>}
            {isProVersion && <TabsTrigger value="license">License</TabsTrigger>}
          </TabsList>

          {/* Builders Tab */}
          <TabsContent value="builders" className="flex-1 overflow-y-auto px-1">
            <OptionsHeader title="Enable Autocomplete (Plain Classes)" className="!border-t-0" />

            <div className="bg-base-2 px-4 rounded">
              <SwitchWithLabel
                label="Gutenberg (FSE)"
                name="autocomplete_gutenberg"
                checked={settings.autocomplete_gutenberg ?? false}
                onChange={onSettingChange("autocomplete_gutenberg")}
              />
              {isProVersion && (
                <>
                  <SwitchWithLabel
                    label="Bricks Builder 2"
                    name="autocomplete_bricks"
                    checked={settings.autocomplete_bricks ?? false}
                    onChange={onSettingChange("autocomplete_bricks")}
                  />
                  <SwitchWithLabel
                    label="Oxygen Builder Classic"
                    name="autocomplete_oxygen"
                    checked={settings.autocomplete_oxygen ?? false}
                    onChange={onSettingChange("autocomplete_oxygen")}
                  />
                  <SwitchWithLabel
                    label="Oxygen Builder 6"
                    name="autocomplete_oxygen6"
                    checked={settings.autocomplete_oxygen6 ?? false}
                    onChange={onSettingChange("autocomplete_oxygen6")}
                  />
                  <SwitchWithLabel
                    label="Elementor Builder"
                    name="autocomplete_elementor"
                    checked={settings.autocomplete_elementor ?? false}
                    onChange={onSettingChange("autocomplete_elementor")}
                  />
                </>
              )}
            </div>


            <OptionsHeader title="Pass Wizard data to Builder and Theme" className="!border-t-0" />
            <div className="bg-base-2 px-4 rounded">
              <SwitchWithLabel
                label="Gutenberg (FSE)"
                name="register_wizzard_data_in_fse"
                checked={settings.register_wizzard_data_in_fse ?? false}
                onChange={onSettingChange("register_wizzard_data_in_fse")}
              />
            </div>

            <OptionsHeader title="Dequeue Styles" />
            <div className="bg-base-2 px-4 rounded">
              <SwitchWithLabel
                label="Gutenberg (FSE)"
                name="dequeue_styles_gutenberg"
                checked={settings.dequeue_styles_gutenberg ?? false}
                onChange={onSettingChange("dequeue_styles_gutenberg")}
              />
              {isProVersion && (
                <>
                  <SwitchWithLabel
                    label="Bricks Builder"
                    name="dequeue_styles_bricks"
                    checked={settings.dequeue_styles_bricks ?? false}
                    onChange={onSettingChange("dequeue_styles_bricks")}
                  />
                  <SwitchWithLabel
                    label="Oxygen Builder"
                    name="dequeue_styles_oxygen"
                    checked={settings.dequeue_styles_oxygen ?? false}
                    onChange={onSettingChange("dequeue_styles_oxygen")}
                  />
                </>
              )}
            </div>

          </TabsContent>

          {/* Editor Tab */}
          <TabsContent value="editor" className="flex-1 overflow-y-auto px-1">
            <OptionsHeader title="Editor Settings" className="!border-t-0" />
            <SelectWrapper
              label="CSS Preprocessor"
              className="mb-4"
              value={settings.css_preprocessor || "css"}
              options={[
                { label: "None (CSS)", value: "css" },
                { label: "SCSS", value: "scss" },
              ]}
              onChange={onSettingChange("css_preprocessor")}
            />
            <SwitchWithLabel
              label="Fold Sidebar for Winden Editor"
              name="folded_sidebar"
              checked={settings.folded_sidebar ?? false}
              onChange={onSettingChange("folded_sidebar")}
            />
          </TabsContent>

          {/* Production Tab */}
          <TabsContent value="production" className="flex-1 overflow-y-auto px-1">
            <OptionsHeader title="Production Settings" className="!border-t-0" />
            <SwitchWithLabel
              label="Disable Dev Mode"
              name="disable_dev_mode"
              checked={settings.disable_dev_mode ?? false}
              onChange={onSettingChange("disable_dev_mode")}
            />
            <p className="text-xsm text-dimmed ml-12 mb-4">
              If enabled, only the compiled output.css will be loaded without scripts that compile classes in browser change.
            </p>

            <SwitchWithLabel
              label="Inline Compiled CSS"
              name="inline_compiled_css"
              checked={settings.inline_compiled_css ?? false}
              onChange={onSettingChange("inline_compiled_css")}
            />
            <p className="text-xsm text-dimmed ml-12 mb-4">
              If enabled, the compiled CSS will be injected as an inline style instead of loading as an external file. This can improve performance by reducing HTTP requests.
            </p>
          </TabsContent>

          {/* Files Scan Tab - Pro only */}
          {isProVersion && (
            <TabsContent value="files-scan" className="flex-1 overflow-y-auto px-1">
              <OptionsHeader title="Files Scan" className="!border-t-0" />
              <FilesScanTab settings={settings} handleChange={onSettingChange} />
            </TabsContent>
          )}

          {/* License Tab - Pro only */}
          {isProVersion && (
            <TabsContent value="license" className="flex-1 overflow-y-auto px-1">
              <OptionsHeader title="Manage License" className="!border-t-0" />
              <p className="mb-4">Your license is currently activated</p>
              <Button
                variant="outline"
                disabled={licenseProcessing}
                onClick={onDeactivateLicense}
              >
                Deactivate License
              </Button>
              {licenseError ? (
                <p className="text-danger mt-2">{licenseError}</p>
              ) : null}
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
