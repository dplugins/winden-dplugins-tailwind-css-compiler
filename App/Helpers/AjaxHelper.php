<?php

namespace Winden\App\Helpers;

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

/**
 * AJAX Helper for Winden plugin
 *
 * Provides centralized methods for JSON input handling and nonce verification
 * to reduce code duplication across AJAX handlers.
 */
class AjaxHelper
{
    /**
     * Get JSON input from the request body
     *
     * @return array|null Decoded JSON data or null if invalid
     */
    public static function getJsonInput(): ?array
    {
        $data = json_decode(file_get_contents('php://input'), true);

        if (!is_array($data)) {
            return null;
        }

        return $data;
    }

    /**
     * Verify nonce from request data
     *
     * @param array  $data   Request data containing the nonce
     * @param string $key    Key name for the nonce in data array
     * @param string $action Nonce action name
     * @return bool True if nonce is valid, false otherwise
     */
    public static function verifyNonce(array $data, string $key = '_nonce', string $action = 'winden_nonce'): bool
    {
        $nonce = isset($data[$key]) ? sanitize_text_field(wp_unslash($data[$key])) : '';
        return wp_verify_nonce($nonce, $action) !== false;
    }

    /**
     * Verify request has valid JSON input and nonce
     *
     * Combined check for common AJAX validation pattern.
     *
     * @param string $capability Required user capability
     * @param string $nonceKey   Key name for the nonce in data array
     * @param string $nonceAction Nonce action name
     * @return array{success: bool, data: ?array, error: ?string}
     */
    public static function validateRequest(
        string $capability = 'edit_posts',
        string $nonceKey = '_nonce',
        string $nonceAction = 'winden_nonce'
    ): array {
        // Get JSON input
        $data = self::getJsonInput();

        if ($data === null) {
            return [
                'success' => false,
                'data' => null,
                'error' => 'Invalid JSON data received.',
            ];
        }

        // Verify user capability
        if (!current_user_can($capability)) {
            return [
                'success' => false,
                'data' => $data,
                'error' => 'You are not allowed to perform this action.',
            ];
        }

        // Verify nonce
        if (!self::verifyNonce($data, $nonceKey, $nonceAction)) {
            return [
                'success' => false,
                'data' => $data,
                'error' => 'You are not allowed to perform this action.',
            ];
        }

        return [
            'success' => true,
            'data' => $data,
            'error' => null,
        ];
    }

    /**
     * Send JSON error response and terminate
     *
     * @param string $message Error message
     * @return never
     */
    public static function sendError(string $message): void
    {
        wp_send_json_error($message);
    }

    /**
     * Send JSON success response and terminate
     *
     * @param mixed $data Response data
     * @return never
     */
    public static function sendSuccess($data = null): void
    {
        wp_send_json_success($data);
    }
}
