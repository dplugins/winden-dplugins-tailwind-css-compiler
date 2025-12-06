<?php

namespace Winden\Pro\License;

use Winden\Pro\License\Enums\LicenseResponseStatus;

class LicenseResponse
{
    public string $status;
    public string $error;

    /**
     * @param array $response
     */
    public function __construct(array $response)
    {
        $attributes = [
            'status' => $response['license'],
            'error' => $response['error'] ?? $response['license']
        ];

        $this->fill($attributes);
    }

    /**
     * @param array $attributes
     * @return LicenseResponse
     */
    public function fill(array $attributes = [])
    {
        foreach ($attributes as $key => $value) {
            // $propertyType = (new \ReflectionProperty($this, $key))->getType()->getName();

            // if (str_contains($propertyType, 'LicenseResponseStatus') && is_string($value)) {
            //     $value = LicenseResponseStatus::tryFrom($value);
            // }

            $this->{$key} = $value;
        }

        return $this;
    }

    /**
     * @return bool
     */
    public function isValidated()
    {
        return $this->status === LicenseResponseStatus::VALID;
    }

    /**
     * @return bool
     */
    public function isFailed()
    {
        return !in_array($this->status, [
            LicenseResponseStatus::VALID,
            LicenseResponseStatus::DEACTIVATED
        ]);
    }

    /**
     * @return bool
     */
    public function isDeactivated()
    {
        return $this->status === LicenseResponseStatus::DEACTIVATED;
    }

    /**
     * @return string|null
     */
    public function errorMessage()
    {
        return LicenseResponseStatus::tryFrom($this->error) ? LicenseResponseStatus::message($this->error) : $this->error;
    }
}