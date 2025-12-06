<?php

namespace Winden\App\Helpers;

use Exception;

class HttpRequest
{
    public static function post($url, array $params)
    {
        $response = wp_remote_post($url, [
            'body'    => $params,
            'timeout' => 10,
        ]);

        if (is_wp_error($response)) {
            // phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- Exception message is used internally, not displayed to users
            throw new Exception('Request failed: ' . $response->get_error_message(), $response->get_error_code());
        }

        $httpCode = wp_remote_retrieve_response_code($response);

        if ($httpCode !== 200) {
            // phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- Exception message is used internally, not displayed to users
            throw new Exception("Request failed with HTTP code $httpCode", $httpCode);
        }

        $body = wp_remote_retrieve_body($response);
        $decodedResponse = json_decode($body, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            // phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- Exception message is used internally, not displayed to users
            throw new Exception('Failed to parse JSON response: ' . json_last_error_msg());
        }

        return $decodedResponse;
    }
}
