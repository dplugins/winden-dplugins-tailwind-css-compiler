import type { WindenSettings, WordPressAjaxResponse } from '@/types/api.d';
import { buildAjaxUrl } from '@/utils/ajaxUrl';

/**
 * Fetch settings from WordPress
 * @param setSettings - State setter function
 * @param json - Whether to return data directly instead of calling setSettings
 * @param callback - Optional callback with settings data
 * @returns Settings data if json=true, otherwise void
 */
export const fetchSettings = async (
  setSettings: (settings: WindenSettings) => void,
  json: boolean = false,
  callback: ((settings: WindenSettings) => void) | null = null
): Promise<WindenSettings | void> => {
  try {
    const response = await fetch(buildAjaxUrl('winden_get_settings'));
    const result: WordPressAjaxResponse<WindenSettings> = await response.json();
    if (result.success) {
      if (json) {
        return result.data;
      } else {
        setSettings(result.data);
        if (typeof callback === 'function') {
          callback(result.data);
        }
      }
    } else {
      console.error('Error fetching settings:', result.data);
    }
  } catch (error) {
    console.error('Error fetching settings:', error);
  }
};

/**
 * Save settings to WordPress
 * @param newSettings - Settings object to save
 */
export const saveSettings = async (newSettings: WindenSettings): Promise<void> => {
  try {
    const response = await fetch(buildAjaxUrl('winden_save_settings'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...newSettings, '_nonce': window.nonce }),
    });
    const result: WordPressAjaxResponse<unknown> = await response.json();
    if (result.success) {
      // console.log('Settings saved successfully!');
    } else {
      console.error('Error saving settings:', result.data);
    }
  } catch (error) {
    console.error('Error saving settings:', error);
  }
};
