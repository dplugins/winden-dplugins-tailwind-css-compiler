/**
 * Error mapping utility for cache errors
 */

import { mapErrorToTab, extractLineNumber, type TabLineMapping } from '@/types/errorMapping';
import type { StyleTab } from '@/types/styleTabs';
import '@/types/global.d.ts';

export interface EnhancedError {
    title?: string;
    message?: string;
    tabName?: string;
    lineInTab?: number;
    context?: string;
}

/**
 * Searches for problematic code in tabs when no line number is available
 */
function searchErrorInTabs(errorMessage: string, tabs: StyleTab[]): EnhancedError | null {
    // Extract potential code from error message
    // For "Cannot apply unknown utility class `font-size:`"
    // Extract "font-size:"
    const codeMatch = errorMessage.match(/`([^`]+)`/);
    if (!codeMatch) return null;

    const searchTerm = codeMatch[1];

    // Search in all tabs
    for (const tab of tabs) {
        const lines = tab.content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(searchTerm)) {
                return {
                    title: undefined,
                    message: errorMessage,
                    tabName: tab.name,
                    lineInTab: i + 1,
                    context: lines[i].trim(),
                };
            }
        }
    }

    return null;
}

/**
 * Enhances error messages with tab and line information
 */
export function enhanceErrorMessages(
    errors: Array<{ title?: string; message?: string }>
): EnhancedError[] {
    // Get tabs from window
    const windenData = window.windenStyleTabs;

    if (!windenData || !('tabs' in windenData) || !windenData.tabs) {
        // If no tab data available, return original errors
        return errors;
    }

    const tabs = windenData.tabs;
    // Build line map from tabs
    const { buildLineMap } = require('@/types/errorMapping');
    const lineMap: TabLineMapping[] = buildLineMap(tabs);

    return errors.map(error => {
        const message = error.message || '';
        const lineNumber = extractLineNumber(message);

        // Try line number mapping first
        if (lineNumber) {
            const mappedError = mapErrorToTab(lineNumber, lineMap, tabs);

            if (mappedError) {
                return {
                    title: error.title,
                    message: error.message,
                    tabName: mappedError.tabName,
                    lineInTab: mappedError.lineInTab,
                    context: mappedError.context,
                };
            }
        }

        // If no line number, try searching for the code in tabs
        const searchResult = searchErrorInTabs(message, tabs);
        if (searchResult) {
            return searchResult;
        }

        return {
            title: error.title,
            message: error.message,
        };
    });
}

/**
 * Formats an enhanced error for display
 */
export function formatEnhancedError(error: EnhancedError): string {
    let formatted = error.message || 'Unknown error';

    if (error.tabName && error.lineInTab) {
        formatted += `\n\n📍 Location: Tab "${error.tabName}", Line ${error.lineInTab}`;
    }

    if (error.context) {
        formatted += `\n\nCode:\n  ${error.context}`;
    }

    return formatted;
}
