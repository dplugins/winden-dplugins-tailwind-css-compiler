import { useEffect } from 'react';
import type { WizzardState } from '@/types/wizzard';

/**
 * Content ref type for save operations
 */
type ContentRef = React.MutableRefObject<string>;
type WizzardRef = React.MutableRefObject<WizzardState | null>;

/**
 * Save handler function signature
 */
type SaveHandler = (
  jsContentRef?: ContentRef,
  scssContentRef?: ContentRef
) => void | Promise<void>;

/**
 * Custom hook to handle Ctrl/Cmd + S save shortcut
 * @param handleSave - Save handler function
 * @param jsContentRef - Reference to JS content
 * @param scssContentRef - Reference to SCSS content
 * @param wizzardContentRef - Reference to wizzard content
 * @param isDataLoading - Loading state flag
 */
export const useSaveShortcut = (
  handleSave: SaveHandler,
  jsContentRef: ContentRef,
  scssContentRef: ContentRef,
  wizzardContentRef: WizzardRef,
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
