export function splitClassVariants(className?: string): { variants: string; utility: string };
export function mergeClassTokens(existingClasses?: string[], incomingClasses?: string[]): string[];
export function getConflictingClasses(existingClasses?: string[], candidateClass?: string): string[];
export function createPreviewHandler(getActiveElement: () => Element | null): {
    applyPreviewClass: (previewClass: string, metadata?: { isPreview?: boolean }) => void;
    clearPreview: () => void;
};
