<?php

namespace Winden\App\Release;

use DateTime;
use DateTimeZone;

class ReleaseResponse
{
    public string $name;
    public string $slug;
    public string $description;
    public string $homeUrl;
    public ?string $downloadUrl = null;
    public string $stableVersion;
    public string $latestVersion;
    public DateTime $latestUpdate;
    public string $changelog;
    public array $icons;
    public array $banners;

    /**
     * @param array $response
     */
    public function __construct(array $response = [])
    {
        if (count($response)) {
            $sections = maybe_unserialize($response['sections']);

            $attributes = [
                'name' => $response['name'],
                'slug' => $response['slug'],
                'description' => $sections['description'],
                'homeUrl' => $response['homepage'],
                'downloadUrl' => $response['download_link'] ?? null,
                'stableVersion' => $response['stable_version'],
                'latestVersion' => $response['new_version'],
                'latestUpdate' => $response['last_updated'],
                'changelog' => $sections['changelog'],
                'icons' => maybe_unserialize($response['icons']),
                'banners' => maybe_unserialize($response['banners'])
            ];

            $this->fill($attributes);
        }
    }

    /**
     * @param array $attributes
     * @return ReleaseResponse
     */
    public function fill(array $attributes = [])
    {
        foreach ($attributes as $key => $value) {
            $propertyType = (new \ReflectionProperty($this, $key))->getType()->getName();

            if (str_contains($propertyType, 'DateTime') && is_string($value)) {
                $datetime = new DateTime($value);
                $datetime->setTimezone(new DateTimeZone('UTC'));
                $value = $datetime; //->format('Y-m-d H:i:s');
            }

            $this->{$key} = $value;
        }

        return $this;
    }

    /**
     * @return array
     */
    public function toArray()
    {
        return [
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'homeUrl' => $this->homeUrl,
            'downloadUrl' => $this->downloadUrl,
            'stableVersion' => $this->stableVersion,
            'latestVersion' => $this->latestVersion,
            'latestUpdate' => $this->latestUpdate->format(DateTime::ATOM),
            'changelog' => $this->changelog,
            'icons' => $this->icons,
            'banners' => $this->banners
        ];
    }
}