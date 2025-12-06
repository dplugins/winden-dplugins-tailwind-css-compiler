import React, { useContext, useEffect } from "react";
import {
  Wrapper,
  Sidebar,
  SidebarSeparator,
  Content,
} from "../components/layout/Layout";
import { WizzardContext, defaultWizzardState } from "@hooks/wizzardContext";
import { useState } from "react";
import { Button } from "@el/Button";
import { DropZone } from "@el/DropZone";
import { ReactComponent as DownloadIcon } from "@/assets/icons/downloadIcon.svg";
import { ReactComponent as UploadIcon } from "@/assets/icons/uploadIcon.svg";
import { ReactComponent as PencilIcon } from "@/assets/icons/pencilIcon.svg";
import DeleteOutlineOutlinedIcon from "@/assets/icons/DeleteOutlineOutlinedIcon.svg";
import { fetchWizzardState } from "../../../../functions/HandleFetch";
import { handleWizzardStateUpdate } from "../../../../functions/HandleSave";
import { ArrowButton } from "@el/ArrowButton";
import { wizardSchema } from "./ExportSchema";
import type { WizzardState } from '@/types/wizzard';

interface BackupsProps {
  onExport: (state: WizzardState | null, stateName: string | null) => void;
}

/**
 * Backups component for managing wizard state backups
 * @param onExport - Callback to export state as JSON file
 */
const Backups: React.FC<BackupsProps> = ({ onExport }) => {
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [hasDropped, setHasDropped] = useState(false);
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [states, setStates] = useState<WizzardState[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const { localWizzardState, setLocalWizzardState } =
    useContext(WizzardContext);

  /**
   * Handle dropped JSON file for import
   * @param file - Dropped file
   */
  const handleDropFile = (file: File): void => {
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        setJsonError(null);
        const jsonData = JSON.parse(event.target?.result as string);
        await wizardSchema.validate(jsonData);
        setLocalWizzardState({ ...defaultWizzardState, ...jsonData });

        setTimeout(() => {
          setHasDropped(false);
        }, 1000);
      } catch (error: any) {
        console.error("Invalid JSON: ", error?.errors || error);
        console.error("Full error details:", JSON.stringify(error, null, 2));
        if (error?.errors) {
          error.errors.forEach((err: string, idx: number) => {
            console.error(`Error ${idx + 1}:`, err);
          });
        }
        setJsonError("Invalid Wizzard Config JSON");

        setTimeout(() => {
          setHasDropped(false);
          setJsonError(null);
        }, 1000);
      }
    };

    reader.readAsText(file);
  };

  /**
   * Fetch saved wizard states from database
   */
  const handleFetchWizzardState = async (): Promise<void> => {
    const wizzardState = await fetchWizzardState();

    if (wizzardState?.length) {
      try {
        const jsonData = JSON.parse(atob(wizzardState as string));
        // Ensure jsonData is an array
        if (Array.isArray(jsonData)) {
          setStates(jsonData);
        } else {
          // Single object found instead of array - this is expected for a fresh install
          // Initialize with empty array since backups haven't been created yet
          setStates([]);
        }
      } catch (error) {
        console.error("Invalid JSON: ", error);
        setStates([]);
      }
    } else {
      // No data found - initialize with empty array
      setStates([]);
    }
  };

  useEffect(() => {
    handleFetchWizzardState();
  }, []);

  /**
   * Remove state at specified index
   * @param array - Array of states
   * @param index - Index to remove
   * @returns Updated array
   */
  function removeStateAtIndex(array: WizzardState[], index: number): WizzardState[] {
    if (index >= 0 && index < array.length) {
      array.splice(index, 1);
    }
    return array;
  }

  /**
   * Load default wizard settings
   */
  const handleLoadDefaultSettings = (): void => {
    setLocalWizzardState(defaultWizzardState);
    window.alert("Default settings have been loaded successfully!");
  };

  /**
   * Handle file input change
   */
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (file) {
      setHasDropped(true);
      handleDropFile(file);
    }
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Open file browser
   */
  const handleClickToUpload = (): void => {
    fileInputRef.current?.click();
  };

  return (
    <Wrapper>
      <Sidebar label="Current state">
        <SidebarSeparator label="Default Settings" />
        <ArrowButton
          variant="outline"
          className="w-full text-left"
          onClick={handleLoadDefaultSettings}
        >
          Reset To Factory Settings
        </ArrowButton>

        <SidebarSeparator label="Export Wizzard" />

        <ArrowButton
          variant="outline"
          className="w-full text-left"
          onClick={() => onExport(null, null)}
        >
          Config as .JSON File
        </ArrowButton>

        <SidebarSeparator label="Import Wizzard" />
        <div
          className="bg-base-1 border border-base-foreground rounded p-10 text-center border-dashed cursor-pointer hover:bg-base-2 transition-colors"
          onClick={handleClickToUpload}
        >
          {hasDropped
            ? jsonError ?? "Importing Wizzard Config..."
            : "Drop Wizzard Config as .JSON file"}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
          />
          <DropZone
            onFilesDrop={(files) => {
              setHasDropped(true);
              if (files?.length) {
                handleDropFile(files[0]);
              }
            }}
          />
        </div>
      </Sidebar>
      <Content>
        <>
          <h1 className="text-xl !font-bold !mb-4 mt-24">Wizzard Backups</h1>

          {states?.length
            ? states.map((state, idx) => {
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-4 border border-border rounded p-2 mb-4"
                  >
                    {isEditing === idx ? (
                      <>
                        <input
                          type="text"
                          className="grow border border-border rounded p-1"
                          value={
                            state?.stateName?.length ? state?.stateName : ""
                          }
                          onChange={(e) => {
                            const _states = [...states];
                            _states[idx] = {
                              ...state,
                              stateName: e.target.value,
                            };
                            setStates(_states);
                          }}
                        />
                        <Button
                          variant="default"
                          onClick={() => {
                            setIsEditing(null);
                            const _states = [...states];
                            handleWizzardStateUpdate(_states, () => {
                              handleFetchWizzardState();
                            });
                          }}
                        >
                          Save
                        </Button>
                      </>
                    ) : (
                      <div className="grow group">
                        <span
                          className=" relative inline-flex items-center cursor-pointer"
                          onClick={() => setIsEditing(idx)}
                        >
                          {state?.stateName?.length
                            ? state?.stateName
                            : "State name"}
                          <PencilIcon
                            className="absolute -right-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ width: '20px', height: '20px' }}
                          />
                        </span>
                      </div>
                    )}
                    <Button
                      icon={<UploadIcon />}
                      variant="outline"
                      onClick={() => {
                        setLocalWizzardState({ ...state });
                        window.alert(`Backup "${state?.stateName || 'Unnamed backup'}" has been applied successfully!`);
                      }}
                    >
                      Load Config
                    </Button>
                    <Button
                      icon={<DownloadIcon />}
                      variant="outline"
                      onClick={() => {
                        onExport({ ...state }, state?.stateName ?? null);
                      }}
                    >
                      Export .JSON
                    </Button>
                    <Button
                      icon={<DeleteOutlineOutlinedIcon />}
                      variant="outline"
                      onClick={() => {
                        const _states = removeStateAtIndex([...states], idx);
                        handleWizzardStateUpdate(_states, () => {
                          handleFetchWizzardState();
                        });
                      }}
                    />
                  </div>
                );
              })
            : null}
          <Button
            size="lg"
            variant="default"
            className="w-full !px-8 !font-medium text-sm !h-11 flex justify-center items-center"
            onClick={() => {
              let stateName = prompt("Please enter state namee");
              if (stateName?.length) {
                const state = {
                  ...localWizzardState,
                  stateName: stateName,
                };
                // Ensure states is always an array before spreading
                const currentStates = Array.isArray(states) ? states : [];
                const _states = [...currentStates];
                _states.push(state);
                handleWizzardStateUpdate(_states, () => {
                  handleFetchWizzardState();
                });
              }
            }}
          >
            + Create new backup
          </Button>
        </>
      </Content>
    </Wrapper>
  );
};

export default Backups;
