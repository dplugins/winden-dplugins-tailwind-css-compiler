import * as React from "react";

export const Tag = ({
  tag,
  index,
  isEditing,
  isFocused,
  onEdit,
  onRemove,
  onInput,
  onKeyDown,
  onFocus,
  autocompleteKey,
  onBlur,
  isDark = false,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging = false,
  previewValue,
}) => {
  const editingRef = React.useRef(null);
  const dragIntentRef = React.useRef(false);

  React.useEffect(() => {
    if (isEditing && editingRef.current) {
      if (previewValue) {
        editingRef.current.textContent = previewValue;
      } else {
        // Restore original tag content when no preview
        editingRef.current.textContent = tag;
      }
    }
  }, [previewValue, isEditing, tag]);

  // Handle initial content when entering edit mode
  React.useEffect(() => {
    if (isEditing && editingRef.current && !previewValue) {
      editingRef.current.textContent = tag;
      // Focus and select all text when entering edit mode
      editingRef.current.focus();

      // Select all text using Range API
      const range = document.createRange();
      range.selectNodeContents(editingRef.current);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }, [isEditing, tag, previewValue]);

  // Handle double-click to select all text
  const handleDoubleClick = (e) => {
    if (editingRef.current) {
      e.preventDefault();
      const range = document.createRange();
      range.selectNodeContents(editingRef.current);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  if (isEditing) {
    return (
      <span
        ref={editingRef}
        className="winauto-textarea--item_editing"
        contentEditable
        onInput={onInput}
        onKeyDown={(e) => {
          // Stop propagation to prevent Elementor/other builders from capturing keyboard events
          e.stopPropagation();
          onKeyDown(e);
        }}
        onDoubleClick={handleDoubleClick}
        role="textbox"
        aria-label="Search for Tailwind classes"
        onFocus={onFocus}
        suppressContentEditableWarning={true}
      />
    );
  }

  return (
    <div
      className={`winauto-textarea--item ${isFocused ? "focused" : ""} ${isDragging ? "dragging" : ""}`}
      onClick={(e) => {
        // Don't enter edit mode if clicking the remove button
        if (e.target.classList.contains('winauto-textarea--item_remove')) {
          return;
        }
        // Only enter edit mode if Ctrl/Cmd is NOT held
        if (!e.ctrlKey && !e.metaKey) {
          onEdit(autocompleteKey + tag, index);
        }
      }}
      onMouseDown={(e) => {
        // Don't handle if clicking the remove button
        if (e.target.classList.contains('winauto-textarea--item_remove')) {
          return;
        }
        if (e.ctrlKey || e.metaKey) {
          dragIntentRef.current = true;
        } else {
          dragIntentRef.current = false;
        }
      }}
      onMouseUp={() => {
        dragIntentRef.current = false;
      }}
      onFocus={(e) => {
        // Don't enter edit mode if clicking the remove button
        if (e.target && e.target.classList.contains('winauto-textarea--item_remove')) {
          return;
        }
        // Don't enter edit mode if draggable is enabled
        if (!dragIntentRef.current) {
          onEdit(autocompleteKey + tag, index);
        }
      }}
      onBlur={onBlur}
      tabIndex={0}
      draggable
      onDragStart={(e) => {
        const allowDrag = dragIntentRef.current || e.ctrlKey || e.metaKey;
        if (!allowDrag) {
          e.preventDefault();
          return;
        }

        dragIntentRef.current = false;
        onDragStart && onDragStart(e, tag, index, autocompleteKey);
      }}
      onDragEnd={(e) => {
        dragIntentRef.current = false;
      }}
      onDragOver={(e) => onDragOver && onDragOver(e)}
      onDrop={(e) => onDrop && onDrop(e, tag, index, autocompleteKey)}
    >
      <span>{tag}</span>
      <button
        type="button"
        tabIndex={-1}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onRemove(autocompleteKey + tag);
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
        onFocus={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
        className="winauto-textarea--item_remove"
      >
        ×
      </button>
    </div>
  );
};
