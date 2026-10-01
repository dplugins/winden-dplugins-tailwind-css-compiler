<?php

namespace Winden\App;

use Winden\App\Assets\Providers\Providers;
use Winden\App\Admin\Admin;
use Winden\App\Helpers\Builders;
use Winden\App\Helpers\Migration;
use Winden\App\Assets\MonacoEditorProvider;
use Winden\App\Caching\AutoCompile;
use Winden\App\Helpers\LicenseManager;
use Winden\App\Helpers\SettingsOptions;
use Winden\App\Blocks\Blocks;

class App
{
    private $executedProviders = [];

    public function __construct()
    {
        $this->runMigration();
        $this->runBlocks();
        $this->runProviders();
        $this->runAdmin();
        $this->registerMonacoHooks();
        $this->initAutoCompile();
        $this->initPageBuilderIntegrations();
    }

    /**
     * Initialize migration handler
     */
    private function runMigration()
    {
        new Migration();
    }

    /**
     * The blocks Winden ships and the block-editor extensions that go with them
     */
    private function runBlocks()
    {
        new Blocks();
    }

    /**
     * Initialize auto-compile functionality
     */
    private function initAutoCompile()
    {
        new AutoCompile();
    }

    /**
     * Initialize page builder integrations
     */
    private function initPageBuilderIntegrations()
    {
        // Oxygen: separate Winden classes input - Pro feature
        if (LicenseManager::proFolderExists() && Builders::isOxygenPluginActivated()) {
            if (SettingsOptions::usesWindenClasses('oxygen')) {
                new \Winden\Pro\PageBuilder\OxygenWindenClasses();
            }
        }
    }

    /**
     * Register Monaco Editor hooks for other plugins
     */
    private function registerMonacoHooks()
    {
        MonacoEditorProvider::registerMonacoHooks();
    }

    /**
     * Run providers with duplicate execution protection
     */
    private function runProviders()
    {
        $providers = new Providers($this);
    }

    /**
     * Run admin functionality
     */
    private function runAdmin()
    {
        $admin = new Admin();
    }

    /**
     * Execute a provider only once
     */
    public function executeProvider($providerClass, $context = '')
    {
        $key = $providerClass . $context;

        if (in_array($key, $this->executedProviders, true)) {
            return; // Already executed
        }

        $provider = new $providerClass();
        $provider->run();
        $this->executedProviders[] = $key;
    }

    /**
     * Check if a provider has already been executed
     */
    public function isProviderExecuted($providerClass, $context = '')
    {
        $key = $providerClass . $context;
        return in_array($key, $this->executedProviders, true);
    }
}
