import { useState } from 'react';
import { Input } from '@el/Input';
import { Button } from '@el/Button';

declare global {
  interface Window {
    websiteUrl?: string;
    nonce?: string;
  }
}

interface LicenseProps {
  setLicenseState: (isActivated: boolean) => void;
}

/**
 * License activation page component
 * @param setLicenseState - Callback to update license state
 */
const License: React.FC<LicenseProps> = ({ setLicenseState }) => {
  const [licenseKey, setLicenseKey] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Activate license with provided key
   */
  async function activateLicense(): Promise<void> {
    if (licenseKey?.length) {
      setProcessing(true);
      setError(null);
      const response = await fetch(`${window.websiteUrl}/wp-admin/admin-ajax.php?action=update_license`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'activate',
          key: licenseKey,
          _nonce: window.nonce
        }),
      });

      const result = await response.json();
      if (result.success) {
        // console.log('result: ', result);
        setLicenseState(result?.data?.status === 'activated');
      } else {
        console.error('Error activating license:', result.data);
        setError(result.data);
      }
      setProcessing(false);
    }
  }

  return (
    <>
      <div className="bg-action-foreground relative z-10 max-w-[450px] w-full mx-auto my-24 p-8 rounded-lg border border-border flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h1 className="!m-0 !p-0 line-height-none">Winden License</h1>
          <span className="text-[0.7rem] rounded-full px-1.5 py-1 bg-action text-danger-foreground">Not Activated</span>
        </div>
        <div className="flex gap-2 items-center [&>div]:w-full">
          <Input
            placeholder="License Key"
            value={licenseKey}
            onChange={(e) => setLicenseKey(e.target.value)}
          />
          <Button onClick={activateLicense} disabled={!licenseKey?.length || processing}>Save</Button>
        </div>
        {error ? (
          <p className='text-danger'>{error}</p>
        ) : null}
      </div>

      <div className="bg-base-2 fixed bottom-0 w-full h-full">
      </div>
    </>
  )
}

export default License;
