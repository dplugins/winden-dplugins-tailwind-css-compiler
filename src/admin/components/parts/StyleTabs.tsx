import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@el/Button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@el/Dialog';
import { Input } from '@el/Input';
import { SelectWrapper } from '@el/SelectWrapper';
import type { StyleTab, LayerType } from '@/types/styleTabs';
import { DEFAULT_LAYER_OPTIONS, createStyleTab } from '@/types/styleTabs';

// Window during which a just-removed tab can still be restored via the
// inline undo bar. 8 s matches Friedman's "Undo > Confirm" guidance.
const UNDO_WINDOW_MS = 8000;

interface StyleTabsProps {
    tabs: StyleTab[];
    activeTabId: string;
    onTabChange: (tabId: string) => void;
    onTabAdd: (tab: StyleTab) => void;
    onTabRemove: (tabId: string) => void;
    onTabUpdate: (tabId: string, updates: Partial<StyleTab>) => void;
}

export const StyleTabs: React.FC<StyleTabsProps> = ({
    tabs,
    activeTabId,
    onTabChange,
    onTabAdd,
    onTabRemove,
    onTabUpdate,
}) => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingTab, setEditingTab] = useState<string | null>(null);
    const [tabName, setTabName] = useState('');
    const [tabLayer, setTabLayer] = useState<LayerType>('none');
    // Track whether the user has typed in the name field so we don't flash
    // a validation error on first open (Silver: validate as the user moves,
    // not before they've started). Empty string disables submit either way.
    const [nameDirty, setNameDirty] = useState(false);
    const trimmedName = tabName.trim();
    const nameInvalid = !trimmedName;
    const showNameError = nameDirty && nameInvalid;

    // Soft-delete state. When a tab is removed, snapshot it here and show
    // an inline undo bar above the tabs. The timeout commits the removal
    // (just clears the snapshot — the parent already removed the tab).
    // If Undo fires first, we re-add the snapshot via onTabAdd.
    const [pendingRemoval, setPendingRemoval] = useState<StyleTab | null>(null);
    const undoTimerRef = useRef<number | null>(null);

    useEffect(() => {
        return () => {
            if (undoTimerRef.current !== null) {
                window.clearTimeout(undoTimerRef.current);
            }
        };
    }, []);

    const handleOpenDialog = (tabId?: string) => {
        if (tabId) {
            // Edit existing tab
            const tab = tabs.find(t => t.id === tabId);
            if (tab) {
                // Don't allow editing locked tabs
                if (tab.isLocked) {
                    return;
                }
                setEditingTab(tabId);
                setTabName(tab.name);
                setTabLayer(tab.layer);
                // Editing → name is already populated, so any subsequent
                // edit counts as a real interaction.
                setNameDirty(true);
            }
        } else {
            // Create new tab
            setEditingTab(null);
            setTabName('');
            setTabLayer('none');
            setNameDirty(false);
        }
        setIsDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setEditingTab(null);
        setTabName('');
        setTabLayer('none');
        setNameDirty(false);
    };

    const handleSaveTab = () => {
        // Inline validation guards the button (disabled when invalid),
        // but keep this as a defensive backstop so a keyboard "Enter"
        // path can't bypass the check.
        if (nameInvalid) {
            setNameDirty(true);
            return;
        }

        if (editingTab) {
            // Update existing tab
            onTabUpdate(editingTab, { name: trimmedName, layer: tabLayer });
        } else {
            // Create new tab
            const newTab = createStyleTab(trimmedName, tabLayer, '');
            onTabAdd(newTab);
            onTabChange(newTab.id);
        }

        handleCloseDialog();
    };

    const handleRemoveTab = (tabId: string) => {
        const tab = tabs.find(t => t.id === tabId);

        // Don't allow removing locked tabs
        if (tab?.isLocked) {
            alert('The main styles tab is always required — you can add another tab next to it.');
            return;
        }

        if (tabs.length === 1) {
            alert('Keep at least one tab — add a new one before removing this last one.');
            return;
        }

        // Friedman: Undo > Confirm. Remove immediately, then offer an
        // 8-second undo via the inline bar above the tab strip. If a
        // previous removal is still pending, commit it (no double-undo).
        if (pendingRemoval) {
            if (undoTimerRef.current !== null) window.clearTimeout(undoTimerRef.current);
        }
        setPendingRemoval(tab ?? null);
        onTabRemove(tabId);

        if (undoTimerRef.current !== null) {
            window.clearTimeout(undoTimerRef.current);
        }
        undoTimerRef.current = window.setTimeout(() => {
            setPendingRemoval(null);
            undoTimerRef.current = null;
        }, UNDO_WINDOW_MS);
    };

    const handleUndoRemoval = () => {
        if (!pendingRemoval) return;
        // onTabAdd will re-append; sortedTabs places it by order, so the
        // restored tab returns to its original slot in the strip.
        onTabAdd(pendingRemoval);
        setPendingRemoval(null);
        if (undoTimerRef.current !== null) {
            window.clearTimeout(undoTimerRef.current);
            undoTimerRef.current = null;
        }
    };

    const getLayerBadge = (layer: LayerType) => {
        if (layer === 'none') return null;

        const colorMap: Record<Exclude<LayerType, 'none'>, string> = {
            theme: 'text-purple-700',
            base: 'text-blue-700',
            components: 'text-green-700',
            utilities: 'text-orange-700',
        };

        // Note: colour is decorative; the @<layer> text below is the
        // non-colour differentiator (WCAG 1.4.1).
        return (
            <span className={`text-xs ${colorMap[layer]}`} aria-label={`Layer: ${layer}`}>
                @{layer}
            </span>
        );
    };

    // Sort tabs by order
    const sortedTabs = [...tabs].sort((a, b) => a.order - b.order);

    return (
        <div className="flex flex-col">
            {pendingRemoval && (
                <div
                    role="status"
                    aria-live="polite"
                    className="flex items-center justify-between gap-3 border-b border-border bg-base-2 px-3 py-2 text-sm"
                >
                    <span className="text-foreground/80">
                        Removed <strong>{pendingRemoval.name}</strong>.
                    </span>
                    <Button variant="outline" size="sm" onClick={handleUndoRemoval}>
                        Undo
                    </Button>
                </div>
            )}
            <div className="flex items-center gap-2 bg-base-2 border-b border-border pt-2 pl-2">
            <div className="flex items-stretch gap-1 overflow-x-auto">
                {sortedTabs.map(tab => (
                    <div
                        key={tab.id}
                        className={`group relative flex items-center gap-2 px-3 py-2 rounded-t cursor-pointer transition-colors bg-base-1 cursor-pointer ${
                            activeTabId === tab.id
                                ? 'bg-base-1 text-foreground border border-b-0 border-border'
                                : 'bg-base-2 hover:bg-base-1'
                        }`}
                    >
                        <button
                            onClick={() => onTabChange(tab.id)}
                            onDoubleClick={(e) => {
                                e.stopPropagation();
                                if (!tab.isLocked) {
                                    handleOpenDialog(tab.id);
                                }
                            }}
                            className="flex items-center gap-1 min-w-0 outline-none focus:outline-none"
                        >
                            <span className="truncate max-w-[120px]">{tab.name}</span>
                            {getLayerBadge(tab.layer)}
                        </button>

                        {!tab.isLocked && tabs.length > 1 && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveTab(tab.id);
                                    }}
                                    className="p-1 hover:bg-base-3 rounded cursor-pointer hover:!bg-base-1"
                                    title="Remove tab"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                                    </svg>
                                </button>
                            </div>
                        )}
                    </div>
                ))}

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenDialog()}
                    className="shrink-0 mt-1"
                    title="Add new style tab"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                    </svg>
                </Button>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {editingTab ? 'Edit Style Tab' : 'Add New Style Tab'}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            {editingTab ? 'Edit the name and layer settings for this style tab' : 'Create a new style tab with custom name and layer directive'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label htmlFor="tab-name" className="text-sm font-medium">
                                Tab Name
                            </label>
                            <Input
                                id="tab-name"
                                value={tabName}
                                onChange={(e) => {
                                    setTabName(e.target.value);
                                    if (!nameDirty) setNameDirty(true);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !nameInvalid) {
                                        e.preventDefault();
                                        handleSaveTab();
                                    }
                                }}
                                placeholder="e.g., Typography, Colors, Layout"
                                aria-invalid={showNameError || undefined}
                                aria-describedby={showNameError ? 'tab-name-error' : undefined}
                                autoFocus
                            />
                            {showNameError && (
                                <p id="tab-name-error" className="text-xs text-danger">
                                    Tab name is required.
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="tab-layer" className="text-sm font-medium">
                                Tailwind Layer
                            </label>
                            <SelectWrapper
                                value={tabLayer}
                                onChange={(value) => setTabLayer(value as LayerType)}
                                options={DEFAULT_LAYER_OPTIONS.map(opt => ({
                                    value: opt.value,
                                    label: opt.label,
                                }))}
                            />
                            <p className="text-xs text-muted-foreground">
                                {DEFAULT_LAYER_OPTIONS.find(opt => opt.value === tabLayer)?.description}
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={handleCloseDialog}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveTab} disabled={nameInvalid}>
                            {editingTab ? 'Save Changes' : 'Add Tab'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            </div>
        </div>
    );
};

export default StyleTabs;
