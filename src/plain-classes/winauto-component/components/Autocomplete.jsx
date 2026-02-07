import { useEffect, useRef, useState } from "react";
import { Tag } from "./Tag";
import { SuggestionsList } from "./SuggestionsList";
import { handleBreakpointUpdate } from "../const/Breakpoint";
import { createTagHandlers } from "../const/Tag";
import { createSuggestionHandlers } from "../const/Suggestion";
import { createInputHandlers } from "../const/Input";
import { createKeydownHandler } from "../const/Keydown";
import { mergeClassTokens, getConflictingClasses } from "../../shared/preview-utils";

const areTagListsEqual = (a = [], b = []) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

export const Autocomplete = ({
  onChange,
  defaultTags,
  autocomplete,
  autocompleteKey,
  isScreenChecked,
  screens,
  isDark = true,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  dragOverScreen,
  dragData,
  onPreviewChange,
  onPreviewClassChange,
  blockId = null,
}) => {
  const inputRef = useRef(null);
  const tagRefs = useRef([]);
  const suggestionsRef = useRef(null);
  const latestValuesRef = useRef({ editingTagIndex: -1 });
  const onChangeRef = useRef(onChange);
  const skipNextOnChangeRef = useRef(false);

  // Update the ref when onChange changes
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const [selectedTags, setSelectedTags] = useState(defaultTags ?? []);

  // Sync selectedTags when defaultTags changes externally (e.g., after cleanup in parent)
  // This allows the parent to control the tags (e.g., removing duplicate utility families)
  useEffect(() => {
    if (!defaultTags) return;

    const defaultSet = new Set(defaultTags);
    const currentSet = new Set(selectedTags);

    // Only update if the sets are different (parent cleaned up duplicates)
    const isDifferent = defaultSet.size !== currentSet.size ||
      ![...defaultSet].every(tag => currentSet.has(tag));

    if (isDifferent) {
      skipNextOnChangeRef.current = true;
      setSelectedTags(defaultTags);
    }
  }, [defaultTags]);

  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [editingTagIndex, setEditingTagIndex] = useState(-1);
  const [focusedTagIndex, setFocusedTagIndex] = useState(-1);
  const [breakpoint, setBreakpoint] = useState("");
  const [addBreakpointValue, setaddBreakpointValue] = useState(false);
  const [pasteEvent, setPasteEvent] = useState(false);
  const [pasteOverrideEvent, setPasteOverridesEvent] = useState(false);
  const [hoveredSuggestion, setHoveredSuggestion] = useState(null);
  const [tempTags, setTempTags] = useState(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [lastPreviewClass, setLastPreviewClass] = useState(null);
  const [isKeyboardNavigation, setIsKeyboardNavigation] = useState(false);
  const [editingCursorPosition, setEditingCursorPosition] = useState('end');

  const getMatchingScreenKey = (str = autocompleteKey) => {
    const matchedKey = screens.find((key) => str.startsWith(`${key}:`));
    return matchedKey || null;
  };

  const getBreakpointTags = (__tags) => {
    const initialStates = screens.reduce(
      (acc, key) => {
        acc[key] = [];
        return acc;
      },
      { default: [] }
    );

    __tags.forEach((tag) => {
      screens.forEach((key) => {
        if (tag.startsWith(`${key}:`)) {
          initialStates[key].push(tag);
        }
      });
      if (!tag.includes(":")) {
        initialStates.default.push(tag);
      } else if (tag.includes(":") && !getMatchingScreenKey(tag)) {
        initialStates.default.push(tag);
      }
    });

    return initialStates;
  };

  // Drag and drop handlers for this specific autocomplete instance
  const handleDragStart = (e, tag, index, screenKey) => {
    if (onDragStart) {
      // Get the current screen key for this autocomplete instance
      const currentScreenKey = getMatchingScreenKey() || 'default';
      onDragStart(e, tag, index, currentScreenKey);
    }
  };

  const handleDragOver = (e) => {
    if (onDragOver) {
      onDragOver(e);
    }
  };

  const handleDrop = (e, tag, index, screenKey) => {
    if (onDrop) {
      // Get the current screen key for this autocomplete instance
      const currentScreenKey = getMatchingScreenKey() || 'default';
      onDrop(e, tag, index, currentScreenKey);
    }
  };

  const handleDragEnd = () => {
    if (onDragEnd) {
      onDragEnd();
    }
  };

  // Check if this autocomplete instance is the drag target
  const isDragTarget = dragData && (dragOverScreen === getMatchingScreenKey() || 
                      (dragOverScreen === 'default' && getMatchingScreenKey() === null));

  useEffect(() => {
    latestValuesRef.current = { editingTagIndex };
  }, [editingTagIndex]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside suggestions dropdown
      const clickedOutsideSuggestions = suggestionsRef.current && !suggestionsRef.current.contains(event.target);

      // Check if click is inside an editing tag
      const clickedInsideEditingTag = event.target.closest('.winauto-textarea--item_editing');

      // Only close if clicked outside suggestions AND not inside an editing tag
      if (clickedOutsideSuggestions && !clickedInsideEditingTag) {
        setShowSuggestions(false);
        setEditingTagIndex(-1);
        setFocusedTagIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    const handleActiveElementClassesChange = (event) => {
      // Only respond to events for this specific block (if blockId is provided)
      if (blockId && event.detail.blockId && event.detail.blockId !== blockId) {
        return;
      }

      // Ignore changes when in preview mode to prevent suggestions from closing
      if (isPreviewMode) {
        return;
      }

      if (Array.isArray(event.detail.newClasses)) {
        const nextTags = isScreenChecked
          ? (getBreakpointTags(event.detail.newClasses)[getMatchingScreenKey() ?? "default"] || [])
          : event.detail.newClasses;

        setSelectedTags((prevTags) => {
          if (areTagListsEqual(prevTags, nextTags)) {
            return prevTags;
          }
          skipNextOnChangeRef.current = true;
          return nextTags;
        });
      }
    };
    window.addEventListener(
      "activeElementClassesChange",
      handleActiveElementClassesChange
    );

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener(
        "activeElementClassesChange",
        handleActiveElementClassesChange
      );
    };
  }, []);

  useEffect(() => {
    if (skipNextOnChangeRef.current) {
      skipNextOnChangeRef.current = false;
      return;
    }

    if (typeof onChangeRef.current === "function" && !tempTags) {
      try {
        onChangeRef.current(selectedTags);
      } catch (error) {
        console.warn('Error calling onChange:', error);
      }
    }
  }, [selectedTags, tempTags]);

  useEffect(() => {
    if (editingTagIndex === -1 && inputRef.current) {
      // If the current active element is within the Gutenberg editor content area,
      // do not focus the sidebar input.
      if (document.activeElement.closest(".editor-visual-editor")) {
        return;
      }
      inputRef.current.focus();
      inputRef.current.textContent = "";
    }
    /* if (editingTagIndex === -1) {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.textContent = "";
      }
    } */
  }, [editingTagIndex]);

  // Reset preview mode when editing stops
  useEffect(() => {
    if (editingTagIndex === -1) {
      setIsPreviewMode(false);
      setHoveredSuggestion(null);
      setTempTags(null);
      setLastPreviewClass(null);
      if (typeof onPreviewClassChange === 'function') {
        onPreviewClassChange(null, { isPreview: false, blockId });
      }

      // Clean up any remaining preview styles (Gutenberg only)
      if (typeof wp !== 'undefined' && wp.data && wp.data.select && wp.data.select('core/block-editor')) {
        const selectedBlock = wp.data.select('core/block-editor').getSelectedBlock();
        if (selectedBlock) {
          const editorIframe = document.querySelector('iframe[name="editor-canvas"]') || document.querySelector('iframe.block-editor-iframe');
          const iframeDocument = editorIframe ? editorIframe.contentDocument || editorIframe.contentWindow.document : null;

          if (iframeDocument) {
            // Get the block element directly - don't search for inner elements
            const blockElement = iframeDocument.querySelector('[data-block="' + selectedBlock.clientId + '"]');
            if (blockElement) {
              blockElement.classList.remove('winden-preview');
            }
          }
        }
      }
    }
  }, [editingTagIndex, onPreviewClassChange, blockId]);

  const handleBreakpoint = handleBreakpointUpdate(
    setBreakpoint,
    setaddBreakpointValue,
    inputRef
  );

  const { handleInput, resetInput } = createInputHandlers(
    setBreakpoint,
    setaddBreakpointValue,
    setInputValue,
    setSelectedIndex,
    setSuggestions,
    setShowSuggestions,
    setEditingTagIndex,
    screens,
    autocomplete,
    breakpoint,
    addBreakpointValue,
    inputRef,
    selectedTags,
    setSelectedTags,
    pasteEvent,
    pasteOverrideEvent,
    setPasteEvent,
    setPasteOverridesEvent
  );

  const { addTag, updateTag, removeTag, handleTagClick } = createTagHandlers({
    selectedTags,
    resetInput,
    setSelectedTags,
    setEditingTagIndex,
    setInputValue,
    setSuggestions,
    setShowSuggestions,
    tagRefs,
    autocomplete,
    autocompleteKey,
    setEditingCursorPosition,
  });

  // Function to apply styles directly to the target element
  const applyPreviewStyles = (tags, isPreview = true) => {
    const newPreviewClass = isPreview
      ? (
        editingTagIndex !== -1 &&
        Array.isArray(tags) &&
        typeof tags[editingTagIndex] === 'string'
          ? tags[editingTagIndex]
          : (tags.length > 0 ? tags[tags.length - 1] : null)
      )
      : null;
    const replacedClass =
      editingTagIndex !== -1 &&
      Array.isArray(selectedTags) &&
      typeof selectedTags[editingTagIndex] === 'string'
        ? selectedTags[editingTagIndex]
        : null;
    const existingTagsForConflict = Array.isArray(selectedTags)
      ? selectedTags.filter((_, index) => index !== editingTagIndex)
      : [];
    const conflictCandidates = newPreviewClass
      ? getConflictingClasses(existingTagsForConflict, newPreviewClass)
      : [];
    const finalReplacedClass = replacedClass || conflictCandidates[0] || null;

    // Find the active element (the one being edited in Gutenberg)
    let activeElement = null;

    if (typeof wp !== 'undefined' && wp.data && wp.data.select && wp.data.select('core/block-editor')) {
      const selectedBlock = wp.data.select('core/block-editor').getSelectedBlock();

      if (selectedBlock) {
        const editorIframe = document.querySelector('iframe[name="editor-canvas"]') || document.querySelector('iframe.block-editor-iframe');
        const iframeDocument = editorIframe ? editorIframe.contentDocument || editorIframe.contentWindow.document : null;

        if (iframeDocument) {
          // Get the block element directly - don't search for inner editable elements
          // This ensures we apply styles to the selected block, not its children
          activeElement = iframeDocument.querySelector('[data-block="' + selectedBlock.clientId + '"]');
        }
      }
    }

    if (activeElement) {
      // Only add/remove the preview class, don't modify other classes
      // This prevents destroying existing classes on the element
      if (isPreview && lastPreviewClass) {
        activeElement.classList.remove(lastPreviewClass);
      }
      activeElement.classList.remove('winden-preview');

      if (isPreview) {
        // Only add the NEW class being previewed, not all tags
        if (newPreviewClass) {
          activeElement.classList.add(newPreviewClass);
          setLastPreviewClass(newPreviewClass);
        }
        activeElement.classList.add('winden-preview');
      } else {
        // When leaving preview, remove the preview class
        if (lastPreviewClass) {
          activeElement.classList.remove(lastPreviewClass);
        }
        setLastPreviewClass(null);
      }
    }

    if (typeof onPreviewClassChange === 'function') {
      onPreviewClassChange(newPreviewClass, {
        isPreview,
        tags,
        blockId,
        autocompleteKey,
        replacedClass: finalReplacedClass,
      });
    }
  };

  const buildPreviewTags = (nextClassName) => {
    const nextClass = String(nextClassName || '').trim();
    if (!nextClass) return null;

    const currentTags = Array.isArray(selectedTags) ? selectedTags : [];
    if (editingTagIndex !== -1) {
      const withoutEditingTag = currentTags.filter((_, index) => index !== editingTagIndex);
      return mergeClassTokens(withoutEditingTag, [nextClass]);
    }

    return mergeClassTokens(currentTags, [nextClass]);
  };

  // Handle suggestion hover for preview
  const handleSuggestionHover = (suggestion) => {
    if (isKeyboardNavigation) {
      return;
    }
    setHoveredSuggestion(suggestion);

    let tempTagsToApply = null;

    // Apply hovered class as a replacement-aware preview
    if (!screens.includes(suggestion)) {
      const newTag = (breakpoint || '') + suggestion;
      tempTagsToApply = buildPreviewTags(newTag);
    }

    if (tempTagsToApply) {
      setTempTags(tempTagsToApply);
      setIsPreviewMode(true);

      // Apply the class directly to the target element without triggering events
      applyPreviewStyles(tempTagsToApply, true); // Pass true for isPreview
    }
  };

  const handleSuggestionLeave = () => {
    if (isKeyboardNavigation) {
      return;
    }
    setHoveredSuggestion(null);
    
    // Restore original tags when leaving hover
    if (tempTags) {
      setTempTags(null);
      setIsPreviewMode(false);
      // Restore original styles
      applyPreviewStyles(selectedTags, false); // Pass false for isPreview to restore original
    }
  };

  // Clear temporary state and apply final change when suggestion is clicked
  const clearTempState = () => {
    setHoveredSuggestion(null);
    setIsPreviewMode(false);
    if (typeof onPreviewClassChange === 'function') {
      onPreviewClassChange(null, { isPreview: false, blockId });
    }

    // Clean up preview styles - check in iframe for Gutenberg
    const editorIframe = document.querySelector('iframe[name="editor-canvas"]') || document.querySelector('iframe.block-editor-iframe');
    const iframeDocument = editorIframe ? editorIframe.contentDocument || editorIframe.contentWindow.document : null;

    if (iframeDocument) {
      const previewElement = iframeDocument.querySelector('.winden-preview');
      if (previewElement) {
        previewElement.classList.remove('winden-preview');
        if (lastPreviewClass) {
          previewElement.classList.remove(lastPreviewClass);
        }
      }
    }

    setLastPreviewClass(null);

    if (tempTags) {
      setTempTags(null);
    }
  };

  const { handleSuggestionClick } = createSuggestionHandlers(
    screens,
    handleBreakpoint,
    editingTagIndex,
    breakpoint,
    updateTag,
    addTag,
    clearTempState
  );

  // Get preview value for the currently editing tag
  const getPreviewValue = (index) => {
    if (editingTagIndex === index && hoveredSuggestion) {
      return (breakpoint || '') + hoveredSuggestion;
    }
    return null;
  };

  // In your Autocomplete component
  const handleKeyDown = createKeydownHandler({
    focusedTagIndex,
    editingTagIndex,
    selectedTags,
    suggestions,
    selectedIndex,
    inputValue,
    breakpoint,
    screens,
    autocomplete,
    inputRef,
    setFocusedTagIndex,
    setSelectedIndex,
    setShowSuggestions,
    setBreakpoint,
    setaddBreakpointValue,
    addTag,
    removeTag,
    handleBreakpoint,
    updateTag,
    resetInput,
    handleTagClick,
    handleSuggestionClick,
    showSuggestions,
    setSelectedTags,
    setPasteEvent,
    setPasteOverridesEvent,
    applyPreviewStyles
  });

  const handleKeyDownWithMode = (e) => {
    if (showSuggestions && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      if (!isKeyboardNavigation) {
        setIsKeyboardNavigation(true);
      }
      if (hoveredSuggestion) {
        setHoveredSuggestion(null);
      }
      if (tempTags) {
        setTempTags(null);
        setIsPreviewMode(false);
      }
    }
    handleKeyDown(e);
  };

  return (
    <div
      className={`relative w-full max-w-[100%] ${isDragTarget ? 'drag-target' : ''}`}
      onKeyDown={(e) => {
        // Only stop propagation for keys that autocomplete handles
        // Allow builder shortcuts like Ctrl+S, Ctrl+Z, etc. to bubble up
        const isModifierCombo = e.ctrlKey || e.metaKey;
        const allowedModifierKeys = ['s', 'z', 'y', 'x']; // Save, Undo, Redo, Cut

        if (isModifierCombo && allowedModifierKeys.includes(e.key.toLowerCase())) {
          // Let these shortcuts bubble up to the builder
          return;
        }

        // Stop propagation for navigation keys that autocomplete uses
        const autocompleteKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Escape', 'Backspace', 'Tab'];
        if (autocompleteKeys.includes(e.key) || e.key === ' ' || e.key === ',') {
          e.stopPropagation();
        }
      }}
    >
      <div
        className="winauto-textarea"
        onClick={(e) => {
          // Only focus if clicking directly on the textarea, not on tags
          if (e.target.classList.contains("winauto-textarea")) {
            if (inputRef.current) inputRef.current.focus();
          }
        }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
      >
        {isScreenChecked &&
          (selectedTags || [])
            .map((tag) => tag.replace(autocompleteKey, ""))
            .map((tag, index) => (
              <div
                key={`${tag}-${index}`}
                ref={(el) => (tagRefs.current[index] = el)}
              >
                <Tag
                  tag={tag}
                  index={index}
                  isEditing={editingTagIndex === index}
                  isFocused={focusedTagIndex === index}
                  onEdit={handleTagClick}
                  autocompleteKey={autocompleteKey}
                  onRemove={removeTag}
                  onInput={handleInput}
                  onKeyDown={handleKeyDownWithMode}
                  onFocus={() => setFocusedTagIndex(-1)}
                  onBlur={() => setFocusedTagIndex(-1)}
                  isDark={isDark}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  isDragging={dragData && dragData.originalTag === (autocompleteKey + tag) && dragData.sourceScreen === getMatchingScreenKey()}
                  previewValue={getPreviewValue(index)}
                  cursorPosition={editingTagIndex === index ? editingCursorPosition : 'end'}
                />
              </div>
            ))}

        {!isScreenChecked &&
          (selectedTags || []).map((tag, index) => (
            <div
              key={`${tag}-${index}`}
              ref={(el) => (tagRefs.current[index] = el)}
            >
              <Tag
                tag={tag}
                index={index}
                isEditing={editingTagIndex === index}
                isFocused={focusedTagIndex === index}
                onEdit={handleTagClick}
                autocompleteKey={autocompleteKey}
                onRemove={removeTag}
                onInput={handleInput}
                onKeyDown={handleKeyDownWithMode}
                onFocus={() => setFocusedTagIndex(-1)}
                onBlur={() => setFocusedTagIndex(-1)}
                isDark={isDark}
                previewValue={getPreviewValue(index)}
                cursorPosition={editingTagIndex === index ? editingCursorPosition : 'end'}
              />
            </div>
          ))}

        {editingTagIndex === -1 && (
          <span
            ref={inputRef}
            className="winauto-textbox outline-none inline-block min-w-[20px] grow"
            contentEditable
            onInput={handleInput}
            onKeyDown={(e) => {
              // Allow builder shortcuts like Ctrl+S, Ctrl+Z, etc. to bubble up
              const isModifierCombo = e.ctrlKey || e.metaKey;
              const allowedModifierKeys = ['s', 'z', 'y', 'x']; // Save, Undo, Redo, Cut

              if (isModifierCombo && allowedModifierKeys.includes(e.key.toLowerCase())) {
                // Let these shortcuts bubble up to the builder
                return;
              }

              // Stop propagation for navigation keys that autocomplete uses
              const autocompleteKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Escape', 'Backspace', 'Tab'];
              if (autocompleteKeys.includes(e.key) || e.key === ' ' || e.key === ',') {
                e.stopPropagation();
              }
              handleKeyDownWithMode(e);
            }}
            role="textbox"
            aria-label="Search for Tailwind classes"
          />
        )}
      </div>

      {showSuggestions && (
        <div
          ref={suggestionsRef}
          className="winauto-textarea--suggestions-wrapper"
        >
          <SuggestionsList
            suggestions={suggestions}
            selectedIndex={selectedIndex}
            autocomplete={autocomplete}
            screens={screens}
            onSuggestionClick={handleSuggestionClick}
            isDark={isDark}
            inputValue={inputValue}
            onSuggestionHover={handleSuggestionHover}
            onSuggestionLeave={handleSuggestionLeave}
            onListMouseMove={() => {
              if (isKeyboardNavigation) {
                setIsKeyboardNavigation(false);
              }
            }}
            isKeyboardNavigation={isKeyboardNavigation}
          />
        </div>
      )}
    </div>
  );
};
