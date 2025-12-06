import { useEffect } from 'react';

/**
 * Custom hook to handle Ctrl/Cmd + S save shortcut
 * @param handleSave - Save handler function
 * @param jsContentRef - Reference to JS content
 * @param scssContentRef - Reference to SCSS content
 * @param wizzardContentRef - Reference to wizzard content
 * @param isDataLoading - Loading state flag
 */
export const useSaveShortcut = (
  handleSave: (jsContentRef?: any, scssContentRef?: any) => void,
  jsContentRef: React.MutableRefObject<any>,
  scssContentRef: React.MutableRefObject<any>,
  wizzardContentRef: React.MutableRefObject<any>,
  isDataLoading: boolean
): void => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault(); // Prevent the default save dialog
        if (!isDataLoading) {
          handleSave(jsContentRef, scssContentRef); // Trigger save function on Ctrl + S
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Clean up event listener on component unmount
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleSave, jsContentRef, scssContentRef, isDataLoading]);
};
