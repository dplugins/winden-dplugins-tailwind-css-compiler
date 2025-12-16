/**
 * Fetch settings from WordPress
 * @param setSettings - State setter function
 * @param json - Whether to return data directly instead of calling setSettings
 * @param callback - Optional callback with settings data
 * @returns Settings data if json=true, otherwise void
 */
export const fetchSettings = async (
  setSettings: (settings: any) => void,
  json: boolean = false,
  callback: ((settings: any) => void) | null = null
): Promise<any> => {
  try {
    const response = await fetch(`${(window as any).ajaxUrl || (window as any).websiteUrl + '/wp-admin/admin-ajax.php'}?action=get_winden_settings`);
    const result = await response.json();
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
export const saveSettings = async (newSettings: Record<string, any>): Promise<void> => {
  try {
    const response = await fetch(`${(window as any).ajaxUrl || (window as any).websiteUrl + '/wp-admin/admin-ajax.php'}?action=save_winden_settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...newSettings, '_nonce': (window as any).nonce }),
    });
    const result = await response.json();
    if (result.success) {
      // console.log('Settings saved successfully!');
    } else {
      console.error('Error saving settings:', result.data);
    }
  } catch (error) {
    console.error('Error saving settings:', error);
  }
};
