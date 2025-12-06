export const createSuggestionHandlers = (
    screens,
    handleBreakpoint,
    editingTagIndex,
    breakpoint,
    updateTag,
    addTag,
    clearTempState
  ) => {
    const handleSuggestionClick = (suggestion) => {
      // Clear any temporary state
      if (clearTempState) {
        clearTempState();
      }
      
      if (screens.includes(suggestion)) {
        handleBreakpoint(suggestion);
      } else {
        if (editingTagIndex !== -1) {
          updateTag((breakpoint || '') + suggestion, editingTagIndex);
        } else {
          addTag((breakpoint || '') + suggestion);
        }
      }
    };
  
    return { handleSuggestionClick };
  };