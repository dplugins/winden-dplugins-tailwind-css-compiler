import { mergeClassTokens } from "../../shared/preview-utils";

export const createTagHandlers = (
  { selectedTags,
    resetInput,
    setSelectedTags,
    setEditingTagIndex,
    setInputValue,
    setSuggestions,
    setShowSuggestions,
    tagRefs,
    autocomplete,
    autocompleteKey,
    setEditingCursorPosition }
) => {
  const normalizeTags = (tags = []) =>
    tags
      .map((tag) => String(tag || "").trim())
      .filter(Boolean);

  const addTag = (value) => {
    const updatedValue = `${autocompleteKey}${value}`.trim();
    if (!updatedValue) {
      resetInput();
      return;
    }

    const nextTags = mergeClassTokens(normalizeTags(selectedTags), [updatedValue]);
    setSelectedTags(nextTags);
    resetInput();
  };

  const updateTag = (newValue, editingTagIndex, shouldReset = true) => {
    const normalizedNewValue = String(newValue || "").trim();
    if (!normalizedNewValue) {
      if (shouldReset) {
        resetInput();
      }
      return;
    }

    // Update tag in place to preserve its position
    const updatedTags = [...selectedTags];
    updatedTags[editingTagIndex] = normalizedNewValue;

    // Remove duplicates (keep the first occurrence to preserve edited position)
    const seen = new Set();
    const deduped = updatedTags.filter((tag) => {
      if (seen.has(tag)) {
        return false;
      }
      seen.add(tag);
      return true;
    });

    setSelectedTags(deduped);

    if (shouldReset) {
      resetInput();
    }
  };

  const removeTag = (tagToRemove) => {
    const updatedTags = selectedTags.filter(tag => tag !== tagToRemove);
    setSelectedTags(updatedTags);
  };

  const handleTagClick = (tag, index, cursorPosition = 'end') => {
    setEditingTagIndex(index);
    setInputValue(tag);
    // Pass cursor position to the Tag component
    if (setEditingCursorPosition) {
      setEditingCursorPosition(cursorPosition);
    }

    setSuggestions(
      autocomplete.filter((key) =>
        key.toLowerCase().includes(tag.toLowerCase())
      )
    );
    setShowSuggestions(true);
  };

  return {
    addTag,
    updateTag,
    removeTag,
    handleTagClick
  };
};
