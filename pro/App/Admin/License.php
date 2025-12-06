<?php

namespace Winden\Pro\Admin;

use DateTime;
use DateTimeZone;
use Throwable;
use Winden\Pro\License\LicenseResource;
use Winden\Pro\License\LicenseRepository;
use Winden\Pro\License\LicenseRequest;
use Winden\Pro\License\Exceptions\LicenseFailedResponseException;
use Winden\Pro\License\Exceptions\LicenseDeactivateException;
use Winden\Pro\License\Enums\LicenseStatus;

class License
{
    public const DB_OPTION = 'winden_license';

    public function __construct()
    {
        add_action('wp_ajax_get_license', [$this, 'get_license']);
        add_action('wp_ajax_update_license', [$this, 'update_license']);
        add_action('current_screen', [$this, 'update_current_state']);
    }

    public function get_license()
    {
        // Check for the necessary permissions and nonce verification if required
        if (!current_user_can('edit_posts')) {
            wp_send_json_error('You are not allowed to perform this action.');
            return;
        }

        wp_send_json_success(LicenseResource::make(LicenseRepository::get()));
    }

    public function update_license()
    {
        // Get the JSON data from the request
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Check for the necessary permissions and nonce verification if required
        if (!current_user_can('edit_posts') || !wp_verify_nonce($data['_nonce'], 'winden_nonce')) {
            wp_send_json_error('You are not allowed to perform this action.');
            return;
        }

        switch ($data['action']) {
            case 'activate':
                return $this->activate($data['key']);
            case 'deactivate':
                return $this->deactivate();
        }
    }

    private function activate(string $key)
    {
        try {
            LicenseRequest::activate($key);

            $datetime = new DateTime();
            $datetime->setTimezone(new DateTimeZone('UTC'));

            LicenseRepository::update([
                'key' => $key,
                'status' => LicenseStatus::ACTIVATED,
                'checkedAt' => $datetime
            ]);

            wp_send_json_success(LicenseResource::make(LicenseRepository::get()));
        } catch (Throwable $e) {
            wp_send_json_error(sanitize_text_field($e->getMessage()));
        }
    }

    private function deactivate()
    {
        try {
            if (LicenseRepository::get()->isNotActivated()) {
                throw new LicenseDeactivateException('License has already been deactivated');
            }

            // LicenseRequest::deactivate(LicenseRepository::get()->key);
            LicenseRepository::reset();

            wp_send_json_success(LicenseResource::make(LicenseRepository::get()));
        } catch (Throwable $e) {
            wp_send_json_error(sanitize_text_field($e->getMessage()));
        }
    }

    public function update_current_state()
    {
        $license = LicenseRepository::get();

        if ($license->isOutdated() && $license->key !== null) {
            try {
                LicenseRequest::check($license->key);

                $datetime = new DateTime();
                $datetime->setTimezone(new DateTimeZone('UTC'));

                LicenseRepository::update([
                    'checkedAt' => $datetime
                ]);
            } catch (LicenseFailedResponseException $e) {
                // License validation failed - mark as invalid but keep the key
                // This allows the user to see the license form and reactivate if needed
                $datetime = new DateTime();
                $datetime->setTimezone(new DateTimeZone('UTC'));

                LicenseRepository::update([
                    'status' => LicenseStatus::NOT_ACTIVATED,
                    'checkedAt' => $datetime
                ]);
            } catch (Throwable $e) {
                // Catch any other errors (network timeouts, etc.) to prevent site blocking
                // Don't reset, just update the check time to prevent repeated immediate attempts
                $datetime = new DateTime();
                $datetime->setTimezone(new DateTimeZone('UTC'));

                LicenseRepository::update([
                    'checkedAt' => $datetime
                ]);
            }
        }
    }
}
