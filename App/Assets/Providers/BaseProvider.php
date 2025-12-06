<?php

namespace Winden\App\Assets\Providers;

use Winden\App\Helpers\SettingsOptions;

abstract class BaseProvider
{
    public function __construct()
    {
        // Constructor is now minimal - all setup happens in run()
    }

    /**
     * Main execution method - called by the centralized system
     */
    public function run()
    {
        $this->setupHooks();
    }

    /**
     * Setup provider-specific hooks
     * Each provider should implement this method
     */
    abstract protected function setupHooks();

    /**
     * Load condition logic
     * Each provider should implement this method
     */
    abstract public function load_condition();

    /**
     * Modify Script Loader Tag to add type="inline-module"
     */
    public function modify_script_loader_tag($tag, $handle, $src)
    {
        return ProvidersHelpers::modify_script_loader_tag($tag, $handle, $src);
    }

    /**
     * Load Tailwind CDN Scripts
     */
    public function load_tailwind_cdn()
    {
        ProvidersHelpers::framework_scripts();
    }

    /**
     * Get Winden Cached CSS
     */
    public function enqueue_compiled_css()
    {
        ProvidersHelpers::load_compiled_css();
    }

    /**
     * Get Winden Plain Classes Autocomplete
     */
    public function plain_classes_autocomplete()
    {
        ProvidersHelpers::plain_classes_autocomplete($this->getAutocompleteFolder());
    }

    /**
     * Get the autocomplete folder name for this provider
     * Each provider should implement this method
     */
    abstract protected function getAutocompleteFolder();

    /**
     * Frontend constants
     */
    public function frontend_consts()
    {
        ProvidersHelpers::frontend_consts();
    }
} 