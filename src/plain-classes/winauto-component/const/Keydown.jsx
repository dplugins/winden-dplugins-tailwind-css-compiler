import { useCallback } from "react";

const copyTagsToClipboard = (tags) => {
    const tagString = tags.join(" ");
    // Create a temporary textarea element
    const textArea = document.createElement("textarea");
    textArea.value = tagString;
    textArea.style.position = "fixed"; // Prevent scrolling
    textArea.style.opacity = "0"; // Make it invisible
    document.body.appendChild(textArea);

    // Select and copy the text
    textArea.focus();
    textArea.select();

    try {
        document.execCommand("copy");
    } catch (err) {
        console.error("Error copying tags:", err);
    }

    // Clean up
    document.body.removeChild(textArea);
};

// Smart split function that respects brackets and parentheses
export function smartSplitClasses(text) {
    const classes = [];
    let current = '';
    let squareBracketDepth = 0;
    let parenDepth = 0;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (char === '[') squareBracketDepth++;
        if (char === ']') squareBracketDepth--;
        if (char === '(') parenDepth++;
        if (char === ')') parenDepth--;

        // Only split on space when outside brackets/parens
        if (char === ' ' && squareBracketDepth === 0 && parenDepth === 0) {
            if (current.trim()) {
                classes.push(current.trim());
            }
            current = '';
        } else {
            current += char;
        }
    }

    // Add the last class
    if (current.trim()) {
        classes.push(current.trim());
    }

    return classes;
}

async function pasteClassesFromClipboard() {
    // Check if the current context is secure
    if (!window.isSecureContext) {
        console.warn('Clipboard API is not available in insecure contexts (HTTP).');
        return [];
    }

    // Check for Clipboard API support
    if (navigator.clipboard && navigator.clipboard.readText) {
        try {
            // Attempt to read text from the clipboard
            const clipboardText = await navigator.clipboard.readText();

            return smartSplitClasses(clipboardText);
        } catch (err) {
            // Log any errors encountered during the process
            console.error('Failed to read classes from clipboard: ', err);
            return [];
        }
    }
}

export const createKeydownHandler = ({
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
    removeTag,
    addTag,
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
}) => {
    return useCallback(
        async (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "c") {
                e.preventDefault();
                e.stopPropagation();
                copyTagsToClipboard(selectedTags);
            }

            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === "v") {
                if (window.isSecureContext) {
                    e.preventDefault();
                    const _tags = [...selectedTags].concat([...(await pasteClassesFromClipboard())])
                    setSelectedTags(Array.from(new Set(_tags)));
                    return;
                } else {
                    setPasteEvent(true);
                }
            }

            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "v") {
                if (window.isSecureContext) {
                    e.preventDefault();
                    setSelectedTags([...(await pasteClassesFromClipboard())])
                    return;
                } else {
                    setPasteOverridesEvent(true);
                }
            }

            // Helper function to check if we're inside square brackets or parentheses
            const isInsideBracketsOrParens = (text) => {
                let squareBracketDepth = 0;
                let parenDepth = 0;
                let curlyBracketDepth = 0;

                for (let i = 0; i < text.length; i++) {
                    if (text[i] === '[') squareBracketDepth++;
                    if (text[i] === ']') squareBracketDepth--;
                    if (text[i] === '(') parenDepth++;
                    if (text[i] === ')') parenDepth--;
                    if (text[i] === '{') curlyBracketDepth++;
                    if (text[i] === '}') curlyBracketDepth--;
                }

                // Return true if any bracket is unclosed
                return squareBracketDepth > 0 || parenDepth > 0 || curlyBracketDepth > 0;
            };

            // Only treat space and comma as separators when outside arbitrary values
            // Allow spaces and commas inside [] and () for classes like text-[10px 10px] or calc(100% - 2rem)
            if (e.key === " " || e.key === ",") {
                // Get the actual current text content from the editing element
                const currentText = editingTagIndex !== -1
                    ? (e.target.textContent || '')
                    : inputValue;

                // Check if brackets are unclosed
                if (!isInsideBracketsOrParens(currentText)) {
                    e.preventDefault();
                    if (editingTagIndex === -1 && inputValue) {
                        addTag(inputValue)
                        return;
                    } else if (currentText) {
                        updateTag(currentText, editingTagIndex);
                    }

                    if (inputRef.current) inputRef.current.focus();
                    return;
                }
                // If brackets are unclosed, allow the space/comma to be typed
            }

            // Handle backspace when editing a tag - delete if empty
            if (e.key === "Backspace" && editingTagIndex !== -1) {
                const currentValue = e.target.textContent?.trim() || "";
                if (currentValue === "") {
                    e.preventDefault();
                    removeTag(selectedTags[editingTagIndex]);
                    resetInput();
                    if (inputRef.current) inputRef.current.focus();
                    return;
                }
            }

            // Handle backspace when a tag is focused (not editing)
            if (
                e.key === "Backspace" &&
                focusedTagIndex !== -1 &&
                editingTagIndex === -1
            ) {
                e.preventDefault();
                removeTag(selectedTags[focusedTagIndex]);
                setFocusedTagIndex(-1);
                if (inputRef.current) inputRef.current.focus();
                return;
            }

            if (e.key === "Enter") {
                e.preventDefault();
                if (editingTagIndex !== -1) {
                    // Handle editing mode
                    if (!breakpoint && inputValue.includes(':')) {
                        const [prefix, value] = inputValue.split(':');
                        setBreakpoint(prefix + ':');
                        return;
                    }

                    if (breakpoint && suggestions[selectedIndex]) {
                        updateTag(breakpoint.concat(suggestions[selectedIndex]), editingTagIndex);
                        setBreakpoint("");
                        setaddBreakpointValue(false);
                        resetInput();
                        return;
                    }
                    if (suggestions[selectedIndex]) {
                        updateTag(suggestions[selectedIndex], editingTagIndex);
                        return
                    }
                    if (inputValue) {
                        updateTag(inputValue, editingTagIndex);
                        resetInput();
                    }
                    return;
                } else if (focusedTagIndex !== -1) {
                    handleTagClick(selectedTags[focusedTagIndex], focusedTagIndex);
                    return;
                }
            }


            if (e.key === 'Enter') {
                const currentValue = inputRef.current?.textContent?.trim() || inputValue;
                if (selectedIndex >= 0) {
                    handleSuggestionClick(suggestions[selectedIndex]);
                } else if (inputValue) {
                    // Use smartSplitClasses to respect brackets when splitting
                    smartSplitClasses(inputValue).forEach(tag => {
                        if (tag.trim()) {
                            addTag(tag.trim());
                        }
                    })

                }
            }



            if (e.key === "Escape") {
                if (editingTagIndex !== -1) {
                    e.preventDefault();
                    resetInput();
                    return;
                }
                if (showSuggestions) {
                    e.preventDefault();
                    setShowSuggestions(false);
                    return;
                }
            }

            if (showSuggestions) {
                if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setSelectedIndex((prev) => {
                        const newIndex = prev < suggestions.length - 1 ? prev + 1 : prev;
                        
                        if (newIndex === -1) {
                            applyPreviewStyles(selectedTags, false); // Clear preview when no suggestion is selected
                        } else {
                            const suggestion = suggestions[newIndex];
                            let tempTagsToApply = null;

                            if (editingTagIndex !== -1 && !screens.includes(suggestion) && selectedTags) {
                                const previewValue = (breakpoint || '') + suggestion;
                                const tempTagsCopy = [...selectedTags];
                                tempTagsCopy[editingTagIndex] = previewValue;
                                tempTagsToApply = tempTagsCopy;
                            } else if (editingTagIndex === -1 && !screens.includes(suggestion)) {
                                const newTag = (breakpoint || '') + suggestion;
                                tempTagsToApply = [...selectedTags, newTag];
                            }

                            if (tempTagsToApply) {
                                applyPreviewStyles(tempTagsToApply, true);
                            } else {
                                applyPreviewStyles(selectedTags, false); // Revert to original if no valid tempTags
                            }
                        }
                        return newIndex;
                    });
                    return;
                } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setSelectedIndex((prev) => {
                        const newIndex = prev > -1 ? prev - 1 : -1;

                        if (newIndex === -1) {
                            applyPreviewStyles(selectedTags, false); // Clear preview when no suggestion is selected
                        } else {
                            const suggestion = suggestions[newIndex];
                            let tempTagsToApply = null;

                            if (editingTagIndex !== -1 && !screens.includes(suggestion) && selectedTags) {
                                const previewValue = (breakpoint || '') + suggestion;
                                const tempTagsCopy = [...selectedTags];
                                tempTagsCopy[editingTagIndex] = previewValue;
                                tempTagsToApply = tempTagsCopy;
                            } else if (editingTagIndex === -1 && !screens.includes(suggestion)) {
                                const newTag = (breakpoint || '') + suggestion;
                                tempTagsToApply = [...selectedTags, newTag];
                            }

                            if (tempTagsToApply) {
                                applyPreviewStyles(tempTagsToApply, true);
                            } else {
                                applyPreviewStyles(selectedTags, false); // Revert to original if no valid tempTags
                            }
                        }
                        return newIndex;
                    });
                    return;
                }
            }

            const content = e.target.textContent.trim();

            // Helper function to get cursor position
            const getCursorPosition = (element) => {
                const selection = window.getSelection();
                if (selection.rangeCount === 0) return 0;
                const range = selection.getRangeAt(0);
                const preCaretRange = range.cloneRange();
                preCaretRange.selectNodeContents(element);
                preCaretRange.setEnd(range.endContainer, range.endOffset);
                return preCaretRange.toString().length;
            };

            // Handle arrow navigation with cursor position detection
            if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                // When editing a tag
                if (editingTagIndex !== -1 && e.target.contentEditable === "true") {
                    const cursorPos = getCursorPosition(e.target);
                    const textLength = e.target.textContent.length;

                    if (e.key === "ArrowLeft" && cursorPos === 0 && !e.shiftKey) {
                        // At start of tag, move to previous tag
                        e.preventDefault();
                        if (editingTagIndex > 0) {
                            resetInput();
                            handleTagClick(selectedTags[editingTagIndex - 1], editingTagIndex - 1);
                        } else {
                            resetInput();
                        }
                    } else if (e.key === "ArrowRight" && cursorPos === textLength && !e.shiftKey) {
                        // At end of tag, move to next tag
                        e.preventDefault();
                        if (editingTagIndex < selectedTags.length - 1) {
                            resetInput();
                            handleTagClick(selectedTags[editingTagIndex + 1], editingTagIndex + 1);
                        } else {
                            resetInput();
                            if (inputRef.current) inputRef.current.focus();
                        }
                    }
                    // If not at boundary or shift is pressed, let default behavior handle it (selection)
                    return;
                }

                // When in empty input field - immediately enter edit mode
                if (content === "") {
                    if (e.key === "ArrowLeft") {
                        e.preventDefault();
                        const newIndex = focusedTagIndex === -1 ? selectedTags.length - 1 : Math.max(0, focusedTagIndex - 1);
                        setFocusedTagIndex(newIndex);
                        handleTagClick(selectedTags[newIndex], newIndex);
                    } else if (e.key === "ArrowRight") {
                        e.preventDefault();
                        const newIndex = focusedTagIndex === -1 ? 0 : focusedTagIndex + 1;
                        if (newIndex >= selectedTags.length) {
                            if (inputRef.current) inputRef.current.focus();
                            setFocusedTagIndex(-1);
                        } else {
                            setFocusedTagIndex(newIndex);
                            handleTagClick(selectedTags[newIndex], newIndex);
                        }
                    }
                }
            }


        },
        [
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
            removeTag,
            handleBreakpoint,
            updateTag,
            resetInput,
            handleTagClick,
            handleSuggestionClick,
            showSuggestions,
        ]
    );
};
