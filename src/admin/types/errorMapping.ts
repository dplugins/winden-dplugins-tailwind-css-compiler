/**
 * Error mapping utilities for style tabs
 */

import type { StyleTab } from './styleTabs';

export interface TabLineMapping {
    tabId: string;
    tabName: string;
    startLine: number;
    endLine: number;
    localStartLine: number; // Line number within the tab content
}

export interface MappedError {
    originalError: string;
    tabName: string;
    tabId: string;
    lineInTab: number;
    lineInCombined: number;
    context?: string;
}

/**
 * Builds a map of combined CSS line numbers to their source tabs
 */
export function buildLineMap(tabs: StyleTab[]): TabLineMapping[] {
    const sortedTabs = [...tabs].sort((a, b) => a.order - b.order);
    const lineMap: TabLineMapping[] = [];
    let currentLine = 1;

    sortedTabs.forEach(tab => {
        const trimmedContent = tab.content.trim();
        if (!trimmedContent) return;

        // Count lines for this tab's content
        const sourceComment = `/* Tab: ${tab.name} ${tab.layer !== 'none' ? `(@layer ${tab.layer})` : ''} */`;
        const commentLines = 1; // Source comment is 1 line

        let contentLines = 0;
        if (tab.layer === 'none') {
            contentLines = trimmedContent.split('\n').length;
        } else {
            // @layer wrapper adds 2 lines (opening and closing)
            contentLines = trimmedContent.split('\n').length + 2;
        }

        const totalLines = commentLines + contentLines;

        lineMap.push({
            tabId: tab.id,
            tabName: tab.name,
            startLine: currentLine,
            endLine: currentLine + totalLines - 1,
            localStartLine: tab.layer === 'none' ? commentLines + 1 : commentLines + 2, // +2 for "@layer name {"
        });

        currentLine += totalLines + 2; // +2 for blank lines between tabs
    });

    return lineMap;
}

/**
 * Maps an error line number from combined CSS back to the source tab
 */
export function mapErrorToTab(
    lineNumber: number,
    lineMap: TabLineMapping[],
    tabs: StyleTab[]
): MappedError | null {
    // Find which tab this line belongs to
    const mapping = lineMap.find(
        map => lineNumber >= map.startLine && lineNumber <= map.endLine
    );

    if (!mapping) return null;

    const tab = tabs.find(t => t.id === mapping.tabId);
    if (!tab) return null;

    // Calculate the line number within the tab's content
    const lineInTab = lineNumber - mapping.startLine - (mapping.localStartLine - 1);

    // Get the actual line content for context
    const lines = tab.content.split('\n');
    const context = lines[lineInTab - 1] || '';

    return {
        originalError: `Line ${lineNumber}`,
        tabName: mapping.tabName,
        tabId: mapping.tabId,
        lineInTab: Math.max(1, lineInTab),
        lineInCombined: lineNumber,
        context: context.trim(),
    };
}

/**
 * Parses Tailwind error messages and maps line numbers to tabs
 */
export function parseAndMapErrors(
    errorMessages: Array<{ title?: string; message?: string }>,
    lineMap: TabLineMapping[],
    tabs: StyleTab[]
): Array<{ title?: string; message?: string; mappedError?: MappedError }> {
    return errorMessages.map(error => {
        const message = error.message || '';

        // Try to extract line number from error message
        // Common patterns:
        // - "at line 15"
        // - "Line 15:"
        // - "(15:20)" - line:column
        const linePatterns = [
            /at line (\d+)/i,
            /line (\d+)/i,
            /\((\d+):\d+\)/,
            /:(\d+):\d+/,
        ];

        let lineNumber: number | null = null;
        for (const pattern of linePatterns) {
            const match = message.match(pattern);
            if (match) {
                lineNumber = parseInt(match[1], 10);
                break;
            }
        }

        if (lineNumber) {
            const mappedError = mapErrorToTab(lineNumber, lineMap, tabs);
            if (mappedError) {
                // Enhance the error message with tab information
                const enhancedMessage = `${message}\n\n📍 Location: Tab "${mappedError.tabName}", Line ${mappedError.lineInTab}\n${mappedError.context ? `\nCode: ${mappedError.context}` : ''}`;

                return {
                    ...error,
                    message: enhancedMessage,
                    mappedError,
                };
            }
        }

        return error;
    });
}

/**
 * Extracts line numbers from error messages
 */
export function extractLineNumber(errorMessage: string): number | null {
    const linePatterns = [
        /at line (\d+)/i,
        /line (\d+)/i,
        /\((\d+):\d+\)/,
        /:(\d+):\d+/,
    ];

    for (const pattern of linePatterns) {
        const match = errorMessage.match(pattern);
        if (match) {
            return parseInt(match[1], 10);
        }
    }

    return null;
}
