<?php

namespace Winden\Pro\License;

use Winden\Pro\License\License;

class LicenseResource
{
    private License $license;

    /**
     * @param License $license
     */
    public function __construct(License $license)
    {
        $this->license = $license;
    }

    /**
     * @return array
     */
    public function toArray()
    {
        $this->license->fill([
            'key' => $this->license->key ? $this->redact($this->license->key) : null
        ]);

        return $this->license->toArray();
    }

    /**
     * @param License $license
     * @return array
     */
    public static function make(License $license)
    {
        return (new self($license))->toArray();
    }

    /**
     * Protecting the saved key from compromise on the frontend
     *
     * @param string $value
     * @return array|string|string[]|null
     */
    private function redact(string $value)
    {
        return preg_replace('/(^.{4})(.*)(.{4}$)/', '$1******$3', $value);
    }
}