<?php

namespace Winden\Pro\License;

use Winden\App\Helpers\HttpRequest;
use Winden\Pro\License\LicenseResponse;
use Winden\App\Release\ReleaseResponse;
use Winden\Pro\License\Exceptions\LicenseFailedResponseException;
use Winden\App\Release\Exceptions\ReleaseFailedResponseException;

class LicenseRequest
{
    /**
     * @param string $action
     * @param string $key
     * @return LicenseResponse|ReleaseResponse
     * @throws LicenseFailedResponseException
     * @throws ReleaseFailedResponseException
     */
    private static function make(string $action, string $key)
    {
        $response = HttpRequest::post('https://dplugins.com', [
            'edd_action' => $action,
            'license' => $key,
            'item_id' => 46608,
            'url' => home_url(),
            'nonce' => wp_create_nonce('wp_rest')
        ]);

        if ($action === 'get_version') {
            if (isset($response['msg'])) {
                // phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- Exception message is sanitized and used internally
                throw new ReleaseFailedResponseException(sanitize_text_field($response['msg']));
            }

            $releaseResponse = new ReleaseResponse($response);

            return $releaseResponse;
        } else {
            $licenseResponse = new LicenseResponse($response);
    
            if ($licenseResponse->isFailed()) {
                // phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- Exception message is sanitized and used internally
                throw new LicenseFailedResponseException(sanitize_text_field($licenseResponse->errorMessage()));
            }
    
            return $licenseResponse;
        }
    }

    /**
     * @param string $key
     * @return LicenseResponse
     * @throws LicenseFailedResponseException
     */
    public static function activate(string $key)
    {
        return self::make('activate_license', $key);
    }

    /**
     * @param string $key
     * @return LicenseResponse
     * @throws LicenseFailedResponseException
     */
    public static function deactivate(string $key)
    {
        return self::make('deactivate_license', $key);
    }

    /**
     * @param string $key
     * @return LicenseResponse
     * @throws LicenseFailedResponseException
     */
    public static function check(string $key)
    {
        return self::make('check_license', $key);
    }

    /**
     * @param string $key
     * @return ReleaseResponse
     * @throws GuzzleException
     * @throws LicenseFailedResponseException
     * @throws ReleaseFailedResponseException
     */
    public static function latestRelease(string $key)
    {
        return self::make('get_version', $key);
    }
}
