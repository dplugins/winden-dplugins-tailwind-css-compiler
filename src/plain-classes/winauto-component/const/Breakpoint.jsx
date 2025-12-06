// handleBreakpointUpdate.js
import { useCallback } from "react";

export const handleBreakpointUpdate = (setBreakpoint, setAddBreakpointValue, inputRef) => 
  useCallback((value) => {
    setBreakpoint(value + ":");
    setAddBreakpointValue(true);
    if (inputRef.current) {
      inputRef.current.innerText = value + ":";
      inputRef.current.focus();
      const selection = window.getSelection();
      selection.selectAllChildren(inputRef.current);
      selection.collapseToEnd();
     
    
    }
  }, [setBreakpoint, setAddBreakpointValue, inputRef]);
