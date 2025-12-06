<?php

namespace Winden\Pro\Admin;

use Winden\App\Release\ReleaseResponse;
use Winden\App\Helpers\Builders;
use Winden\App\Helpers\LicenseManager;
use Winden\Pro\License\LicenseRepository;
use Winden\Pro\License\LicenseRequest;

/**
 * Plugin Release/Update Handler
 *
 * Handles checking for and delivering plugin updates from DPlugins.com
 * This is only used in the Pro version - WordPress.org handles updates for the free version
 */
class Release
{
    public function __construct()
    {
        add_filter('pre_set_site_transient_update_plugins', [$this, 'checkRelease']);
        add_filter('plugins_api', [$this, 'releaseDeatil'], 10, 3);
    }

    /**
     * @param object $transient
     * @return object
     */
    public function checkRelease(object $transient)
    {
        $releaseCache = $this->getReleaseCache();

        if (is_array($releaseCache)) {
            $releaseResponse = new ReleaseResponse();
            $releaseResponse->fill($releaseCache);
        } else {
            // Only check for updates if pro folder exists (has license system)
            if (!LicenseManager::proFolderExists()) {
                return $transient;
            }

            try {
                $license = LicenseRepository::get();
                $releaseResponse = LicenseRequest::latestRelease($license->key ?? '');
            } catch (\Throwable $e) {
                // Silently fail and return transient unchanged
                // This prevents site blocking when license validation fails
                return $transient;
            }
        }

        if (isset($releaseResponse) && version_compare(Builders::version(), $releaseResponse->stableVersion, '<')) {
            $baseName = sprintf('%s/%s.php', Builders::baseName(), Builders::baseName());

            $transient->response[$baseName] = (object)[
                'name' => $releaseResponse->name,
                'slug' => $releaseResponse->slug,
                'plugin' => $baseName,
                'homepage' => $releaseResponse->homeUrl,
                'new_version' => $releaseResponse->stableVersion,
                'package' => $releaseResponse->downloadUrl,
                'icons' => $releaseResponse->icons,
                'banners' => $releaseResponse->banners
            ];

            $this->setReleaseCache($releaseResponse->toArray());
        }

        return $transient;
    }

    /**
     * @param bool $result
     * @param string $action
     * @param object $args
     * @return bool|object
     */
    public function releaseDeatil(bool $result, string $action, object $args)
    {
        if ($action !== 'plugin_information') {
            return $result;
        }

        if ($args->slug !== Builders::baseName()) {
            return $result;
        }

        $baseName = sprintf('%s/%s.php', Builders::baseName(), Builders::baseName());
        $releaseCache = $this->getReleaseCache();

        if (is_array($releaseCache)) {
            $releaseResponse = new ReleaseResponse();
            $releaseResponse->fill($releaseCache);

            return (object)[
                'name' => $releaseResponse->name,
                'slug' => $releaseResponse->slug,
                'plugin' => $baseName,
                'homepage' => $releaseResponse->homeUrl,
                'icons' => $releaseResponse->icons,
                'banners' => $releaseResponse->banners,
                'download_link' => $releaseResponse->downloadUrl,
                'pluginVersion' => $releaseResponse->stableVersion,
                'author' => 'DPlugins',
                'sections' => [
                    'description' => $releaseResponse->description,
                    'changelog' => $releaseResponse->changelog
                ],
                'last_updated' => $releaseResponse->latestUpdate->format('c')
            ];
        }

        return $result;
    }

    /**
     * @param array $data
     * @return void
     */
    private function setReleaseCache(array $data)
    {
        set_transient('winden_latest_release', $data, 60 * 60 * 24);
    }

    /**
     * @return mixed
     */
    private function getReleaseCache()
    {
        return get_transient('winden_latest_release');
    }
}
