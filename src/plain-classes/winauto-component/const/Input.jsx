import useDebounce from "../hooks/Debounce";
import { smartSplitClasses } from "./Keydown";

export const createInputHandlers = (
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
) => {
    // Debounced input handler
    const handleInput = useDebounce((e) => {
        const value = e.target.textContent;

        // Handle breakpoint prefix
        if (value.includes(":")) {
            const [prefix, val] = value.split(':');
            setBreakpoint(prefix + ':');
            setaddBreakpointValue(true);

        } else if (breakpoint) {
            setBreakpoint("");
            setaddBreakpointValue(false);
        }

        // Update input value
        setInputValue(value);

        if (pasteEvent) {
            setPasteEvent(false);
            if (typeof value === "string" && value?.length) {
                let _tags = smartSplitClasses(value);
                _tags = [...selectedTags].concat([..._tags]);
                _tags = Array.from(new Set(_tags));
                setSelectedTags(_tags);
            }
        } else if (pasteOverrideEvent) {
            setPasteOverridesEvent(false);
            if (typeof value === "string" && value?.length) {
                let _tags = smartSplitClasses(value);
                setSelectedTags([..._tags]);
            }
        } else {
            // Generate suggestions with optimized filtering
            // Limit results to prevent performance issues with large autocomplete lists
            const MAX_SUGGESTIONS = 100;
            const searchValue = value.toLowerCase();

            let currentSuggestions;

            if (value.includes(":")) {
                const [prefix, val] = value.split(":");
                if (addBreakpointValue && val) {
                    const searchVal = val.toLowerCase();
                    const results = [];
                    for (let i = 0; i < autocomplete.length && results.length < MAX_SUGGESTIONS; i++) {
                        if (autocomplete[i].toLowerCase().includes(searchVal)) {
                            results.push(autocomplete[i]);
                        }
                    }
                    currentSuggestions = results;
                } else {
                    currentSuggestions = [];
                }
            } else if (searchValue) {
                // Prioritize startsWith matches, then includes matches
                const startsWithMatches = [];
                const includesMatches = [];

                for (let i = 0; i < autocomplete.length; i++) {
                    const lower = autocomplete[i].toLowerCase();
                    if (lower.startsWith(searchValue)) {
                        startsWithMatches.push(autocomplete[i]);
                    } else if (lower.includes(searchValue)) {
                        includesMatches.push(autocomplete[i]);
                    }
                    // Early exit if we have enough results
                    if (startsWithMatches.length + includesMatches.length >= MAX_SUGGESTIONS) {
                        break;
                    }
                }

                // Add screen matches
                const screenMatches = screens.filter((key) =>
                    key.toLowerCase().includes(searchValue)
                );

                currentSuggestions = [...startsWithMatches, ...includesMatches, ...screenMatches].slice(0, MAX_SUGGESTIONS);
            } else {
                currentSuggestions = [];
            }

            // Update UI state
            setSelectedIndex(-1);
            setSuggestions(currentSuggestions);
            setShowSuggestions(currentSuggestions.length > 0);
        }
    }, 100);

    // Reset input handler
    const resetInput = () => {
        if (inputRef.current) {
            inputRef.current.focus();
            inputRef.current.textContent = "";
        }

        setInputValue("");
        setShowSuggestions(false);
        setSelectedIndex(-1);
        setEditingTagIndex(-1);
    };

    return {
        handleInput,
        resetInput
    };
};