<?php

namespace Winden\Pro\License;

use DateTime;
use DateTimeZone;
use Winden\Pro\License\Enums\LicenseStatus;

class License
{
    /** @var string|null */
    public $key = null;
    /** @var string */
    public $status = LicenseStatus::NOT_ACTIVATED;
    /** @var DateTime|null */
    public $checkedAt = null;

    /**
     * @param array $attributes
     */
    public function __construct(array $attributes = [])
    {
        $this->fill($attributes);
    }

    /**
     * @param array $attributes
     * @return License
     */
    public function fill(array $attributes = [])
    {
        foreach ($attributes as $key => $value) {
            $reflectionProperty = new \ReflectionProperty($this, $key);
            $docComment = $reflectionProperty->getDocComment();
            
            // Check if the property is DateTime from PHPDoc
            if ($docComment && strpos($docComment, 'DateTime') !== false && is_string($value)) {
                $datetime = new DateTime($value);
                $datetime->setTimezone(new DateTimeZone('UTC'));
                $value = $datetime;
            }

            $this->{$key} = $value;
        }

        return $this;
    }

    /**
     * @return bool
     */
    public function isActivated()
    {
        return $this->status === LicenseStatus::ACTIVATED;
    }

    /**
     * @return bool
     */
    public function isNotActivated()
    {
        return $this->status === LicenseStatus::NOT_ACTIVATED;
    }

    /**
     * Check the current date against the date of the last check
     * If it is older than a week, then the license status needs to be updated
     *
     * @return bool
     */
    public function isOutdated()
    {
        $datetime = new DateTime();
        $datetime->setTimezone(new DateTimeZone('UTC'));

        if ($this->checkedAt === null) {
            return true;
        }

        return $this->checkedAt->diff($datetime)->days >= 7;
    }

    /**
     * @return array
     */
    public function toArray()
    {
        return [
            'key' => $this->key,
            'status' => $this->status,
            'checkedAt' => $this->checkedAt ? $this->checkedAt->format(DateTime::ATOM) : null
        ];
    }
}
