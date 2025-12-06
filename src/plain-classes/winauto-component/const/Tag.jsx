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
    autocompleteKey }
) => {
  const addTag = (value) => {
    const updatedValue = autocompleteKey + value;
    if (selectedTags.includes(updatedValue)) {
      resetInput();
      return;
    }
    selectedTags.push(updatedValue);
    setSelectedTags([...selectedTags]);
    resetInput();
  };

  const updateTag = (newValue, editingTagIndex, shouldReset = true) => {
    if (selectedTags.includes(newValue)) {
      resetInput();
      return;
    }
    selectedTags[editingTagIndex] = newValue;
    setSelectedTags([...selectedTags]);

    if (shouldReset) {
      resetInput();
    }
  };

  const removeTag = (tagToRemove) => {
    const updatedTags = selectedTags.filter(tag => tag !== tagToRemove);
    setSelectedTags(updatedTags);
  };

  const handleTagClick = (tag, index) => {
    setEditingTagIndex(index);
    setInputValue(tag);

    setTimeout(() => {
      if (tagRefs.current[index]) {
        const span = tagRefs.current[index].querySelector('[role="textbox"]');
        if (span) {
          span.textContent = tag;
          span.focus();
          const selection = window.getSelection();
          selection.selectAllChildren(span);
          selection.collapseToEnd();
        }
      }
    }, 0);

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