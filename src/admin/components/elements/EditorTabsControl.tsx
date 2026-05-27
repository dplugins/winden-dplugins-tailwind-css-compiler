import * as React from "react";
import { Switch } from "./Switch";
import { Label } from "./Label";
import {
  DEFAULT_EDITOR_TABS,
  EDITOR_TAB_LABELS,
  normalizeEditorTabs,
  type EditorTabKey,
  type EditorTabSetting,
} from "@const/settings";

interface EditorTabsControlProps {
  value?: EditorTabSetting[];
  onChange: (next: EditorTabSetting[]) => void;
}

/**
 * Sortable list with per-row visibility toggle for the main editor tabs.
 *
 * - Drag the row (or its grip) to reorder.
 * - Keyboard: focus a row's grip and use Arrow Up / Arrow Down to move it.
 * - The toggle on the right hides a tab from the main nav, but at least one
 *   tab must remain visible (the last visible toggle becomes disabled).
 */
export const EditorTabsControl: React.FC<EditorTabsControlProps> = ({
  value,
  onChange,
}) => {
  const tabs = React.useMemo(() => normalizeEditorTabs(value), [value]);
  const [dragIndex, setDragIndex] = React.useState<number | null>(null);
  const [overIndex, setOverIndex] = React.useState<number | null>(null);

  const visibleCount = tabs.filter((t) => t.visible).length;

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= tabs.length) return;
    const next = tabs.slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  const setVisible = (key: EditorTabKey, visible: boolean) => {
    onChange(tabs.map((t) => (t.value === key ? { ...t, visible } : t)));
  };

  const onKeyDown = (idx: number) => (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      move(idx, idx - 1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      move(idx, idx + 1);
    }
  };

  return (
    <div className="mb-4">
      <Label className="text-sm font-medium block mb-2">Editor tabs</Label>
      <p className="text-xs text-base-foreground/60 mb-3">
        Drag to reorder. Toggle to hide a tab from the main nav. At least one tab must stay visible.
      </p>
      <ul className="border border-border rounded-md divide-y divide-border bg-base-1">
        {tabs.map((tab, idx) => {
          const isLastVisible = tab.visible && visibleCount === 1;
          const isOver = overIndex === idx && dragIndex !== null && dragIndex !== idx;
          return (
            <li
              key={tab.value}
              draggable
              onDragStart={(e) => {
                setDragIndex(idx);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (overIndex !== idx) setOverIndex(idx);
              }}
              onDragLeave={() => {
                if (overIndex === idx) setOverIndex(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIndex !== null) move(dragIndex, idx);
                setDragIndex(null);
                setOverIndex(null);
              }}
              onDragEnd={() => {
                setDragIndex(null);
                setOverIndex(null);
              }}
              className={`flex items-center gap-3 px-3 py-2.5 ${
                isOver ? "bg-base-2" : ""
              } ${dragIndex === idx ? "opacity-50" : ""}`}
            >
              <span
                role="button"
                tabIndex={0}
                aria-label={`Reorder ${EDITOR_TAB_LABELS[tab.value]}`}
                onKeyDown={onKeyDown(idx)}
                className="text-base-foreground/40 hover:text-base-foreground cursor-grab active:cursor-grabbing select-none px-1 leading-none focus:outline-none focus:ring-2 focus:ring-ring rounded"
                aria-grabbed={dragIndex === idx}
              >
                ⋮⋮
              </span>
              <Label
                htmlFor={`editor_tab_${tab.value}`}
                className="text-sm font-normal cursor-pointer flex-1"
              >
                {EDITOR_TAB_LABELS[tab.value]}
              </Label>
              <Switch
                id={`editor_tab_${tab.value}`}
                checked={tab.visible}
                disabled={isLastVisible}
                onCheckedChange={(checked) => setVisible(tab.value, checked)}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
};

EditorTabsControl.displayName = "EditorTabsControl";

export { DEFAULT_EDITOR_TABS };
