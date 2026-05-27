import { useQuery } from '@tanstack/react-query'
import type { WizzardState, WizzardContentResponse } from '@/types/wizzard'
import { buildAjaxUrl } from '@/utils/ajaxUrl'
import { setServerUpdatedAt } from '@functions/HandleSave'
import '@/types/global.d.ts'

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

            const response = await fetch(buildAjaxUrl('winden_get_content'));
            const dbData: WizzardContentResponse = await response.json();

            if (!dbData.success) {
                console.warn('No content found in database, using defaults');
                // Fresh install — no server timestamp yet; treat the next save
                // as the seed (HandleSave passes null and PHP skips the
                // stale-write check when neither side has an updated_at).
                setServerUpdatedAt(null);
                return {
                    javascript: DEFAULT_JS_CONTENT,
                    scss: DEFAULT_CSS_CONTENT,
                    wizzard: null
                };
            }

            // Initialize the stale-write timestamp from the server response.
            // HandleSave reads this on save so PHP can reject if anyone else
            // saved between fetch and save. Missing this call (regression
            // from the React-Query migration) made every save look stale.
            setServerUpdatedAt(dbData.data.updated_at ?? null);

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
                `${window.uploadUrl}/winden/tailwind.config.js?_t=${Date.now()}`,
                dbData.data.javascript,
                DEFAULT_JS_CONTENT
            );

            result.scss = await fetchFileOrUseDB(
                `${window.uploadUrl}/winden/style-tab.css?_t=${Date.now()}`,
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
        // The admin user is the only one editing — there's no out-of-band
        // change to chase. Disable React Query's default refetch behaviours
        // so the endpoint hits the server exactly once per page load
        // (instead of 3–5× from mount + focus + reconnect events).
        staleTime: Infinity,
        gcTime: Infinity,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });
}
