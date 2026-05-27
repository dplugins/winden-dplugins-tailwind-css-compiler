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
import { EditorTabsControl } from "@el/EditorTabsControl";
import type { EditorTabSetting } from "@const/settings";

interface Settings {
  autocomplete_gutenberg?: boolean;
  autocomplete_bricks?: boolean;
  autocomplete_oxygen?: boolean;
  autocomplete_oxygen6?: boolean;
  autocomplete_elementor?: boolean;
  autocomplete_builderius?: boolean;
  winden_classes_gutenberg?: boolean;
  winden_classes_bricks?: boolean;
  winden_classes_oxygen?: boolean;
  winden_classes_oxygen6?: boolean;
  winden_classes_elementor?: boolean;
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
  autocomplete_mode?: "plain-classes" | "winden-classes";
  editor_tabs?: EditorTabSetting[];
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
            <OptionsHeader title="Enable Autocomplete" className="!border-t-0" />

            {/* Nested tabs for Plain Classes / Winden Classes */}
            <Tabs
              value={settings.autocomplete_mode || "plain-classes"}
              onValueChange={(value) => onSettingChange("autocomplete_mode")(value)}
              className="w-full"
            >
              <TabsList className="inline-flex p-1 bg-base-3 rounded-lg mb-4">
                <TabsTrigger
                  value="plain-classes"
                  className="px-4 py-1.5 text-xs font-medium rounded-md transition-all data-[state=active]:bg-base-foreground data-[state=active]:text-base-1 data-[state=active]:shadow-sm data-[state=active]:after:hidden data-[state=inactive]:text-base-foreground/60 data-[state=inactive]:hover:text-base-foreground"
                >
                  Plain Classes
                </TabsTrigger>
                <TabsTrigger
                  value="winden-classes"
                  className="px-4 py-1.5 text-xs font-medium rounded-md transition-all data-[state=active]:bg-base-foreground data-[state=active]:text-base-1 data-[state=active]:shadow-sm data-[state=active]:after:hidden data-[state=inactive]:text-base-foreground/60 data-[state=inactive]:hover:text-base-foreground"
                >
                  Winden Classes
                </TabsTrigger>
              </TabsList>

              {/* Plain Classes sub-tab */}
              <TabsContent value="plain-classes">
                <div className="bg-base-2 px-4 rounded">
                  <SwitchWithLabel
                    label="Gutenberg (FSE)"
                    name="autocomplete_gutenberg"
                    checked={settings.autocomplete_gutenberg ?? false}
                    onChange={(value) => {
                      onSettingChange("autocomplete_gutenberg")(value);
                      // Disable Winden Classes when Plain Classes is enabled
                      if (value) onSettingChange("winden_classes_gutenberg")(false);
                    }}
                  />
                  {isProVersion && (
                    <>
                      <SwitchWithLabel
                        label="Bricks Builder"
                        name="autocomplete_bricks"
                        checked={settings.autocomplete_bricks ?? false}
                        onChange={(value) => {
                          onSettingChange("autocomplete_bricks")(value);
                          // Disable Winden Classes when Plain Classes is enabled
                          if (value) onSettingChange("winden_classes_bricks")(false);
                        }}
                      />
                      <SwitchWithLabel
                        label="Oxygen Builder Classic"
                        name="autocomplete_oxygen"
                        checked={settings.autocomplete_oxygen ?? false}
                        onChange={(value) => {
                          onSettingChange("autocomplete_oxygen")(value);
                          // Disable Winden Classes when Plain Classes is enabled
                          if (value) onSettingChange("winden_classes_oxygen")(false);
                        }}
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
                      <SwitchWithLabel
                        label="Builderius"
                        name="autocomplete_builderius"
                        checked={settings.autocomplete_builderius ?? false}
                        onChange={onSettingChange("autocomplete_builderius")}
                      />
                    </>
                  )}
                </div>
              </TabsContent>

              {/* Winden Classes sub-tab - Gutenberg available for all, Bricks/Oxygen Pro only */}
              <TabsContent value="winden-classes">
                <div className="bg-base-2 px-4 rounded">
                  <SwitchWithLabel
                    label="Gutenberg (FSE)"
                    name="winden_classes_gutenberg"
                    checked={settings.winden_classes_gutenberg ?? false}
                    onChange={(value) => {
                      onSettingChange("winden_classes_gutenberg")(value);
                      // Disable Plain Classes when Winden Classes is enabled
                      if (value) onSettingChange("autocomplete_gutenberg")(false);
                    }}
                  />
                  {isProVersion && (
                    <>
                      <SwitchWithLabel
                        label="Bricks Builder (Separate Class System)"
                        name="winden_classes_bricks"
                        checked={settings.winden_classes_bricks ?? false}
                        onChange={(value) => {
                          onSettingChange("winden_classes_bricks")(value);
                          // Disable Plain Classes when Winden Classes is enabled
                          if (value) onSettingChange("autocomplete_bricks")(false);
                        }}
                      />
                      <SwitchWithLabel
                        label="Oxygen Builder Classic (Separate Class System)"
                        name="winden_classes_oxygen"
                        checked={settings.winden_classes_oxygen ?? false}
                        onChange={(value) => {
                          onSettingChange("winden_classes_oxygen")(value);
                          // Disable Plain Classes when Winden Classes is enabled
                          if (value) onSettingChange("autocomplete_oxygen")(false);
                        }}
                      />
                      <SwitchWithLabel
                        label="Oxygen Builder 6 (Separate Class System)"
                        name="winden_classes_oxygen6"
                        checked={settings.winden_classes_oxygen6 ?? false}
                        onChange={(value) => {
                          onSettingChange("winden_classes_oxygen6")(value);
                          // Disable Plain Classes when Winden Classes is enabled
                          if (value) onSettingChange("autocomplete_oxygen6")(false);
                        }}
                      />
                      <SwitchWithLabel
                        label="Elementor"
                        name="winden_classes_elementor"
                        checked={settings.winden_classes_elementor ?? false}
                        onChange={(value) => {
                          onSettingChange("winden_classes_elementor")(value);
                          // Disable Plain Classes when Winden Classes is enabled
                          if (value) onSettingChange("autocomplete_elementor")(false);
                        }}
                      />
                    </>
                  )}
                </div>

                {isProVersion && ( 
                  <p>Learn more about <a href="https://docs.dplugins.com/winden/autocomplete/#separate-class-system" target="_blank" className="">Separate Classes System</a>.</p>
                )}

              </TabsContent>
            </Tabs>

            <OptionsHeader title="Pass Wizard data to Builder and Theme" />
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
            <EditorTabsControl
              value={settings.editor_tabs}
              onChange={(next) => onSettingChange("editor_tabs")(next)}
            />
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
