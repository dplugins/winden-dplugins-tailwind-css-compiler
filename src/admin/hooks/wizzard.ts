import { useQuery } from '@tanstack/react-query'
import type { WizzardState, WizzardContentResponse } from '@/types/wizzard'

/**
 * Hook to fetch content (JS, SCSS, and Wizzard state) from WordPress
 * Replaces fetchContent from HandleFetch.js
 */
export function useWizzardContent() {
    const fetchContent = async (): Promise<{
        javascript: string;
        scss: string;
        wizzard: WizzardState | null;
    }> => {
        try {
            // Import defaults dynamically to avoid circular dependencies
            const { DEFAULT_JS_CONTENT, DEFAULT_CSS_CONTENT } = await import('@/const/contentDefaults');

            const response = await fetch(`${(window as any).ajaxUrl || (window as any).websiteUrl + '/wp-admin/admin-ajax.php'}?action=get_winden_content`);
            const dbData: WizzardContentResponse = await response.json();

            if (!dbData.success) {
                console.warn('No content found in database, using defaults');
                // Return defaults on fresh install
                return {
                    javascript: DEFAULT_JS_CONTENT,
                    scss: DEFAULT_CSS_CONTENT,
                    wizzard: null
                };
            }

            const result = {
                javascript: '',
                scss: '',
                wizzard: dbData.data.wizzard
            };

            // Helper to fetch file or use database content
            const fetchFileOrUseDB = async (
                fileUrl: string,
                dbContent: string,
                defaultContent: string
            ): Promise<string> => {
                try {
                    const fileResponse = await fetch(fileUrl);
                    if (fileResponse.ok) {
                        return await fileResponse.text();
                    }
                    return atob(dbContent) || defaultContent;
                } catch (error) {
                    console.error(`Error fetching ${fileUrl}:`, error);
                    return atob(dbContent) || defaultContent;
                }
            };

            // Fetch JS content (Config Tab) and SCSS content
            result.javascript = await fetchFileOrUseDB(
                `${(window as any).uploadUrl}/winden/tailwind.config.js?_t=${Date.now()}`,
                dbData.data.javascript,
                DEFAULT_JS_CONTENT
            );

            result.scss = await fetchFileOrUseDB(
                `${(window as any).uploadUrl}/winden/style-tab.css?_t=${Date.now()}`,
                dbData.data.scss,
                DEFAULT_CSS_CONTENT
            );

            return result;
        } catch (error) {
            console.error('Error in useWizzardContent:', error);
            throw error;
        }
    };

    return useQuery({
        queryKey: ['wizzard-content'],
        queryFn: fetchContent,
        retry: 2,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}
