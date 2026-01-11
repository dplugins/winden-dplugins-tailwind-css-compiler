import { useEffect, useRef, useState } from "react";
import { Tag } from "./Tag";
import { SuggestionsList } from "./SuggestionsList";
import { handleBreakpointUpdate } from "../const/Breakpoint";
import { createTagHandlers } from "../const/Tag";
import { createSuggestionHandlers } from "../const/Suggestion";
import { createInputHandlers } from "../const/Input";
import { createKeydownHandler } from "../const/Keydown";

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
}) => {
  const inputRef = useRef(null);
  const tagRefs = useRef([]);
  const suggestionsRef = useRef(null);
  const latestValuesRef = useRef({ editingTagIndex: -1 });
  const onChangeRef = useRef(onChange);

  // Update the ref when onChange changes
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const [selectedTags, setSelectedTags] = useState(defaultTags ?? []);
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
      // Ignore changes when in preview mode to prevent suggestions from closing
      if (isPreviewMode) {
        return;
      }

      if (Array.isArray(event.detail.newClasses)) {
        if (isScreenChecked) {
          const _tags = getBreakpointTags(event.detail.newClasses);
          const _screen = getMatchingScreenKey() ?? "default";
          setSelectedTags(_tags[_screen]);
        } else {
          // Don't use getBreakpointTags when not in screen mode
          // It uses Object.values().flat() which doesn't preserve order
          setSelectedTags(event.detail.newClasses);
        }
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
      
      // Clean up any remaining preview styles (Gutenberg only)
      if (typeof wp !== 'undefined' && wp.data && wp.data.select && wp.data.select('core/block-editor')) {
        const selectedBlock = wp.data.select('core/block-editor').getSelectedBlock();
        if (selectedBlock) {
          const editorIframe = document.querySelector('iframe[name="editor-canvas"]') || document.querySelector('iframe.block-editor-iframe');
          const iframeDocument = editorIframe ? editorIframe.contentDocument || editorIframe.contentWindow.document : null;

          if (iframeDocument) {
            const blockElement = iframeDocument.querySelector('[data-block="' + selectedBlock.clientId + '"]');
            const activeElementToClean = blockElement ? (blockElement.querySelector('.block-editor-rich-text__editable') || blockElement) : null;
            if (activeElementToClean) {
              activeElementToClean.classList.remove('winden-preview');
            }
          }
        }
      }
    }
  }, [editingTagIndex]);

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
  });

  // Function to apply styles directly to the target element
  const applyPreviewStyles = (tags, isPreview = true) => {
    // Find the active element (the one being edited in Gutenberg)
    let activeElement = null;
    
    if (typeof wp !== 'undefined' && wp.data && wp.data.select && wp.data.select('core/block-editor')) {
      const selectedBlock = wp.data.select('core/block-editor').getSelectedBlock();

      if (selectedBlock) {
        const editorIframe = document.querySelector('iframe[name="editor-canvas"]') || document.querySelector('iframe.block-editor-iframe');
        const iframeDocument = editorIframe ? editorIframe.contentDocument || editorIframe.contentWindow.document : null;

        if (iframeDocument) {
          const blockElement = iframeDocument.querySelector('[data-block="' + selectedBlock.clientId + '"]');
          activeElement = blockElement ? (blockElement.querySelector('.block-editor-rich-text__editable') || blockElement) : null;
        }
      }
    }

    if (activeElement) {
      // First, remove any classes that were explicitly applied by a previous preview
      if (lastPreviewClass) {
        activeElement.classList.remove(lastPreviewClass);
      }
      activeElement.classList.remove('winden-preview'); // Always remove the marker class from the active element

      // Get all classes currently on the activeElement
      const currentClassesOnElement = Array.from(activeElement.classList);
      
      // Determine classes to remove: any class currently on the element that is NOT in the new 'tags'
      const classesToRemove = currentClassesOnElement.filter(cls => !tags.includes(cls));

      // Determine classes to add: any class in 'tags' that is NOT currently on the element
      const classesToAdd = tags.filter(cls => !currentClassesOnElement.includes(cls));

      classesToRemove.forEach(cls => activeElement.classList.remove(cls));
      classesToAdd.forEach(cls => activeElement.classList.add(cls));

      if (isPreview) {
        const newPreviewClass = editingTagIndex !== -1 && tags.length > editingTagIndex ? tags[editingTagIndex] : null;
        setLastPreviewClass(newPreviewClass);
        activeElement.classList.add('winden-preview');
      } else {
        setLastPreviewClass(null); // Clear lastPreviewClass when not in preview mode
      }
    }
  };

  // Handle suggestion hover for preview
  const handleSuggestionHover = (suggestion) => {
    setHoveredSuggestion(suggestion);
    
    let tempTagsToApply = null;

    // Apply the hovered class to the target element
    if (editingTagIndex !== -1 && !screens.includes(suggestion) && selectedTags) {
      const previewValue = (breakpoint || '') + suggestion;
      const tempTagsCopy = [...selectedTags];
      tempTagsCopy[editingTagIndex] = previewValue;
      tempTagsToApply = tempTagsCopy;
    } else if (editingTagIndex === -1 && !screens.includes(suggestion)) {
      // If not in editing mode, we create a new temporary tag array that includes the hovered suggestion.
      const newTag = (breakpoint || '') + suggestion;
      tempTagsToApply = [...selectedTags, newTag];
    }

    if (tempTagsToApply) {
      setTempTags(tempTagsToApply);
      setIsPreviewMode(true);
      
      // Apply the class directly to the target element without triggering events
      applyPreviewStyles(tempTagsToApply, true); // Pass true for isPreview
    }
  };

  const handleSuggestionLeave = () => {
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
    setLastPreviewClass(null);
    
    // Clean up preview styles
    const activeElement = document.querySelector('.editor-styles-wrapper .winden-preview');
    if (activeElement) {
      activeElement.classList.remove('winden-preview');
    }
    
    if (tempTags) {
      setTempTags(null);
      // Apply the final change when clicking a suggestion
      if (typeof onChangeRef.current === "function") {
        try {
          onChangeRef.current(tempTags);
        } catch (error) {
          console.warn('Error calling onChange with final tags:', error);
        }
      }
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

  return (
    <div
      className={`relative w-100 max-w-[100%] ${isDragTarget ? 'drag-target' : ''}`}
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
                  onKeyDown={handleKeyDown}
                  onFocus={() => setFocusedTagIndex(-1)}
                  onBlur={() => setFocusedTagIndex(-1)}
                  isDark={isDark}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  isDragging={dragData && dragData.originalTag === (autocompleteKey + tag) && dragData.sourceScreen === getMatchingScreenKey()}
                  previewValue={getPreviewValue(index)}
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
                onKeyDown={handleKeyDown}
                onFocus={() => setFocusedTagIndex(-1)}
                onBlur={() => setFocusedTagIndex(-1)}
                isDark={isDark}
                previewValue={getPreviewValue(index)}
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
              handleKeyDown(e);
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
          />
        </div>
      )}
    </div>
  );
};
