// handleBreakpointUpdate.js
import { useCallback } from "react";

export const handleBreakpointUpdate = (setBreakpoint, setAddBreakpointValue, inputRef) => 
  useCallback((value) => {
    setBreakpoint(value + ":");
    setAddBreakpointValue(true);
    if (inputRef.current) {
      inputRef.current.innerText = value + ":";
      inputRef.current.focus();
      try {
        const selection = window.getSelection();
        if (selection) {
          selection.selectAllChildren(inputRef.current);
          selection.collapseToEnd();
        }
      } catch (e) {
        // Ignore selection errors in edge cases
      }
    }
  }, [setBreakpoint, setAddBreakpointValue, inputRef]);
