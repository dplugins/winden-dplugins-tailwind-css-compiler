<?php

namespace Winden\Pro\License\Enums;

class LicenseResponseStatus
{
    const VALID = 'valid';
    const INVALID = 'invalid';
    const INACTIVE = 'inactive';
    const SITE_INACTIVE = 'site_inactive';
    const KEY_MISMATCH = 'key_mismatch';
    const EXPIRED = 'expired';
    const NO_ACTIVATIONS_LEFT = 'no_activations_left';
    const DISABLED = 'disabled';
    const MISSING = 'missing';
    const DEACTIVATED = 'deactivated';
    const FAILED = 'failed';

    public static function tryFrom($value)
    {
        $constants = (new \ReflectionClass(__CLASS__))->getConstants();
        if (in_array($value, $constants, true)) {
            return $value;
        }
        return null;
    }

    /**
     * @return string
     */
    public static function message($status)
    {
        switch ($status) {
            case self::INVALID:
                return 'License was not found';
            case self::INACTIVE:
                return 'License has been inactivated';
            case self::SITE_INACTIVE:
                return 'License has not been activated for this site';
            case self::KEY_MISMATCH:
                return 'License has not been valid for this product';
            case self::EXPIRED:
                return 'License has expired';
            case self::NO_ACTIVATIONS_LEFT:
                return 'License has reached activation limit';
            case self::DISABLED:
                return 'License has been revoked';
            case self::MISSING:
                return 'License was not found';
            case self::DEACTIVATED:
                return 'License has been deactivated';
            case self::FAILED:
                return 'Unknown error';
            default:
                return 'Status not recognized';
        }
    }
}