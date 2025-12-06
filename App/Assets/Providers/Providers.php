<?php

namespace Winden\App\Assets\Providers;

use Winden\App\Helpers\Builders;
use Winden\App\Helpers\SettingsOptions;
use Winden\App\Helpers\LicenseManager;

class Providers
{
    private $app;

    public function __construct($app)
    {
        $this->app = $app;

        // Hook provider detection to after_setup_theme so theme functions are available
        // Priority 20 to ensure theme is fully loaded (default is 10)
        add_action('after_setup_theme', [$this, 'initProviders'], 20);
    }

    /**
     * Initialize providers after theme is loaded
     * This ensures Bricks/Oxygen/Elementor functions are available
     */
    public function initProviders()
    {
        $this->determineAndRunProvider();
        $this->runFSEData();
        $this->runBricks2Data();
    }

    /**
     * Determine which provider to run based on the current context
     */
    private function determineAndRunProvider()
    {
        $isProActive = LicenseManager::isProActive();

        // Pro builders - require license
        if (Builders::isOxygen6EditorPage()) {
            if ($isProActive) {
                $this->app->executeProvider(\Winden\Pro\Providers\Oxygen6::class);
            } else {
                $this->loadFrontendWithProNotice('Oxygen 6');
            }
        } else if (Builders::isOxygenEditorPage()) {
            if ($isProActive) {
                $this->app->executeProvider(\Winden\Pro\Providers\Oxygen::class);
            } else {
                $this->loadFrontendWithProNotice('Oxygen');
            }
        } else if (Builders::isElementorEditorPage()) {
            if ($isProActive) {
                $this->app->executeProvider(\Winden\Pro\Providers\Elementor::class);
            } else {
                $this->loadFrontendWithProNotice('Elementor');
            }
        } else if (Builders::isBricksEditorPage()) {
            if ($isProActive) {
                $this->app->executeProvider(\Winden\Pro\Providers\Bricks2::class);
            } else {
                $this->loadFrontendWithProNotice('Bricks');
            }
        } else if (Builders::isGutenbergEditorPage() || (function_exists('has_blocks') && has_blocks())) {
            // Free: Gutenberg/FSE - always available
            $this->app->executeProvider(\Winden\App\Assets\Providers\FSE::class);
        } else {
            // Frontend - always available
            $this->app->executeProvider(\Winden\App\Assets\Providers\Frontend::class);
        }
    }

    /**
     * Load frontend provider and show pro upgrade notice
     *
     * @param string $builderName Name of the page builder
     */
    private function loadFrontendWithProNotice(string $builderName)
    {
        $this->app->executeProvider(\Winden\App\Assets\Providers\Frontend::class);

        add_action('admin_notices', function () use ($builderName) {
            ?>
            <div class="notice notice-info is-dismissible">
                <p>
                    <strong>Winden:</strong> <?php echo esc_html($builderName); ?> integration requires a Pro license.
                    <a href="https://winden.dev" target="_blank">Upgrade to Pro</a>
                </p>
            </div>
            <?php
        });
    }

    /**
     * Run FSE data provider (always runs regardless of context)
     */
    private function runFSEData()
    {
        $this->app->executeProvider(\Winden\App\Assets\Providers\FSEData::class);
    }

    /**
     * Run Bricks 2.0 data provider (only runs if Pro is active)
     */
    private function runBricks2Data()
    {
        if (LicenseManager::isProActive()) {
            $this->app->executeProvider(\Winden\Pro\Providers\Bricks2Data::class);
        }
    }
}
