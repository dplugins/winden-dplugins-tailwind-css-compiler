/**
 * Handle saving settings with state update
 * @param newSettings - New settings to save
 * @param setSettings - State setter function
 */
export const handleSaveSettings = async (
  newSettings: Record<string, any>,
  setSettings: (settings: Record<string, any>) => void
): Promise<void> => {
  setSettings(newSettings); // Update local state
  const response = await fetch(`${(window as any).websiteUrl}/wp-admin/admin-ajax.php?action=save_winden_settings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...newSettings, '_nonce': (window as any).nonce }),
  });
  const data = await response.json();
  if (data.success) {
    // console.log('Settings saved successfully!');
  } else {
    console.error('Error saving settings:', data.data);
  }
};
