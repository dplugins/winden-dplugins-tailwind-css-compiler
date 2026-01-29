import * as React from "react";

export const SuggestionsList = ({
  suggestions,
  selectedIndex,
  autocomplete,
  screens,
  onSuggestionClick,
  isDark = false,
  inputValue,
  onSuggestionHover,
  onSuggestionLeave,
  onListMouseMove,
  isKeyboardNavigation,
}) => {
  const [sortSuggestion, setSortSuggestion] = React.useState([]);

  React.useEffect(() => {
    const sortedSuggestions = suggestions.sort((a, b) => {
      // First priority: starts with input value
      const aStartsWith = a.startsWith(inputValue) ? 0 : 1;
      const bStartsWith = b.startsWith(inputValue) ? 0 : 1;

      if (aStartsWith !== bStartsWith) {
        return aStartsWith - bStartsWith;
      }

      // Second priority: number of hyphens
      const aHyphens = (a.match(/-/g) || []).length;
      const bHyphens = (b.match(/-/g) || []).length;

      if (aHyphens !== bHyphens) {
        return aHyphens - bHyphens;
      }

      // Third priority: numeric values
      const aMatch = a.match(/\d+/);
      const bMatch = b.match(/\d+/);
      const aNum = aMatch ? parseInt(aMatch[0]) : 0;
      const bNum = bMatch ? parseInt(bMatch[0]) : 0;

      if (aNum !== bNum) {
        return aNum - bNum;
      }

      // Last resort: alphabetical order
      return a.localeCompare(b);
    });
    setSortSuggestion(sortedSuggestions);
  }, [suggestions, inputValue]);

  const listRef = React.useRef(null);
  const itemRefs = React.useRef({});

  React.useEffect(() => {
    if (
      selectedIndex >= 0 &&
      itemRefs.current[selectedIndex] &&
      listRef.current
    ) {
      const listRect = listRef.current.getBoundingClientRect();
      const itemRect = itemRefs.current[selectedIndex].getBoundingClientRect();

      if (itemRect.bottom > listRect.bottom) {
        listRef.current.scrollTop += itemRect.bottom - listRect.bottom;
      } else if (itemRect.top < listRect.top) {
        listRef.current.scrollTop -= listRect.top - itemRect.top;
      }
    }
  }, [selectedIndex]);

  return (
    <ul
      ref={listRef}
      className={`winauto-textarea--suggestions ${
        isKeyboardNavigation ? "winauto-suggestions--keyboard" : ""
      }`}
      onMouseMove={() => onListMouseMove && onListMouseMove()}
    >
      {sortSuggestion.map((suggestion, index) => (
        <li
          key={suggestion}
          ref={(el) => (itemRefs.current[index] = el)}
          className={`winauto-textarea--suggestions-item ${
            index === selectedIndex ? "winauto-li-hovered" : ""
          }`}
          onClick={() => onSuggestionClick(suggestion)}
          onMouseEnter={() =>
            !isKeyboardNavigation &&
            onSuggestionHover &&
            onSuggestionHover(suggestion)
          }
          onMouseLeave={() =>
            !isKeyboardNavigation && onSuggestionLeave && onSuggestionLeave()
          }
        >
          <span className="ml-2 grow">{suggestion}</span>
        </li>
      ))}
    </ul>
  );
};
