import '@/types/global.d.ts';

interface CacheStatusData {
  status: 'completed' | 'failed' | null;
  errors?: string;
  createdAt?: string;
  auto_fixed?: boolean;
}

const normalizeStatus = (status: string | null | undefined): 'completed' | 'failed' | null => {
  if (status === 'success') {
    return 'completed';
  }
  if (status === 'failed') {
    return 'failed';
  }
  if (status === 'completed') {
    return 'completed';
  }
  return null;
};

/**
 * Fetch cache build status from WordPress
 * @param setCacheStatus - Callback to update cache status state
 * @param signal - Optional AbortSignal for cancellation
 * @returns Promise that resolves to the cache status data (including auto_fixed flag)
 */
export const fetchCacheStatus = async (
  setCacheStatus: (status: CacheStatusData) => void,
  signal?: AbortSignal
): Promise<CacheStatusData | null> => {
  try {
    const response = await fetch(`${window.ajaxUrl}?action=winden_get_cache`, { signal });
    const data = await response.json();

    if (data.success) {
      const normalizedStatus: CacheStatusData = {
        ...data.data,
        status: normalizeStatus(data?.data?.status),
        auto_fixed: data?.data?.auto_fixed || false,
      };
      setCacheStatus(normalizedStatus);
      return normalizedStatus;
    } else {
      return null;
    }
  } catch (error) {
    // Silently ignore AbortError (expected on component unmount)
    if (error instanceof Error && error.name === 'AbortError') {
      return null;
    }
    return null;
  }
};
