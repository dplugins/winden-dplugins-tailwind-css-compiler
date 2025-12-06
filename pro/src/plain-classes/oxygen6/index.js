import { createRoot } from 'react-dom/client';
import WindenAutocompleteWithScreens from '../../../../src/plain-classes/winauto-component/WindenAutocompleteWithScreens';
import './index.scss';

// Plain Classes for Oxygen 6 - React Integration

// Global state
if (typeof currentElementClasses === 'undefined') {
    var currentElementClasses = [];
}

// Prevent rapid successive updates
let lastUpdateTime = 0;
const UPDATE_THROTTLE = 200; // milliseconds

// Native Oxygen6 Integration API
window.PlainClassesAPI = {
    // State
    isInitialized: false,
    vueComponentRef: null,
    watcherCleanups: [],

    // Find and hook into existing Vue component
    hookIntoVueComponent() {
        // Clean up previous watchers and references
        this.cleanup();

        const app = getVueApp();
        if (!app) return false;

        // Find ClassDropdown component in the Vue tree
        const findClassDropdown = (component, depth = 0) => {
            if (!component || depth > 10) return null;

            // Check if this is the ClassDropdown component
            if (component.$options.name === 'ClassDropdown' ||
                (component.updateClasses && component.elementClasses && component.availableClasses && component.createFromNameAndSelect)) {
                return component;
            }

            // Search children
            if (component.$children?.length > 0) {
                for (const child of component.$children) {
                    const found = findClassDropdown(child, depth + 1);
                    if (found) return found;
                }
            }

            return null;
        };

        this.vueComponentRef = findClassDropdown(app);

        if (this.vueComponentRef) {
            this.setupComponentWatchers();
            this.isInitialized = true;
            return true;
        }

        return false;
    },

    // Setup watchers on the existing component
    setupComponentWatchers() {
        if (!this.vueComponentRef) return;

        const component = this.vueComponentRef;

        // Watch for class changes by observing elementClasses getter
        const unwatchClasses = component.$watch(
            () => component.elementClasses,
            (newClasses, oldClasses) => {
                if (JSON.stringify(newClasses) !== JSON.stringify(oldClasses)) {
                    this.syncFromVue(newClasses);
                }
            },
            { deep: true }
        );

        // Watch for element changes
        const unwatchElement = component.$watch(
            () => component.elementId,
            (newId, oldId) => {
                if (newId !== oldId) {
                    window.dispatchEvent(new CustomEvent('vue-element-changed', {
                        detail: { elementId: newId, oldElementId: oldId }
                    }));
                }
            }
        );

        this.watcherCleanups.push(unwatchClasses, unwatchElement);
    },

    // Get current classes from Vue component
    getClassesFromVue() {
        if (!this.vueComponentRef) return [];

        const component = this.vueComponentRef;

        // Try different property names that might hold the classes
        const elementClasses = component.elementClasses || component.classes || component.selectedClasses || [];
        const availableClasses = component.availableClasses || component.allClasses || [];

        // Convert class IDs to names
        return elementClasses
            .map(id => availableClasses.find(c => c.id === id))
            .filter(cls => cls)
            .map(cls => cls.name);
    },

    // Add classes using native Oxygen6 methods
    async addClasses(classNames) {
        if (!this.vueComponentRef) return false;

        try {
            // console.log('Plain Classes API: Adding classes via native methods:', classNames);

            for (const className of classNames) {
                // Create class if it doesn't exist
                const existingClass = this.vueComponentRef.createClassIfNeeded(className);
                // console.log('Plain Classes API: Created/Found class:', className, 'with ID:', existingClass.id);

                // Add to current element
                await this.vueComponentRef.updateClasses([...this.vueComponentRef.elementClasses, existingClass.id]);
            }

            // console.log('Plain Classes API: Successfully added classes via native methods');
            return true;
        } catch (error) {
            console.error('Plain Classes API: Error adding classes via native methods:', error);
            return false;
        }
    },

    // Remove classes using native Oxygen6 methods
    async removeClasses(classNames) {
        if (!this.vueComponentRef) return false;

        try {
            const availableClasses = this.vueComponentRef.availableClasses || [];
            const currentClassIds = this.vueComponentRef.elementClasses || [];

            // Find class IDs to remove
            const classIdsToRemove = classNames
                .map(className => availableClasses.find(c => c.name === className))
                .filter(cls => cls)
                .map(cls => cls.id);

            // Remove from current element
            const updatedClassIds = currentClassIds.filter(id => !classIdsToRemove.includes(id));
            await this.vueComponentRef.updateClasses(updatedClassIds);

            return true;
        } catch (error) {
            console.error('Plain Classes API: Error removing classes:', error);
            return false;
        }
    },

    // Sync classes from Vue to plain plugin
    syncFromVue(classIds) {
        if (!this.vueComponentRef) return;

        const availableClasses = this.vueComponentRef.availableClasses || [];
        const classNames = classIds
            .map(id => availableClasses.find(c => c.id === id))
            .filter(cls => cls)
            .map(cls => cls.name);

        currentElementClasses = classNames;
        updateComponentDisplay();

        // Dispatch event for other listeners
        window.dispatchEvent(new CustomEvent('plain-classes-synced-from-vue', {
            detail: { classes: classNames, classIds }
        }));
    },

    // Cleanup
    cleanup() {
        if (this.watcherCleanups.length > 0) {
            this.watcherCleanups.forEach(cleanup => cleanup());
            this.watcherCleanups = [];
        }
        this.vueComponentRef = null;
        this.isInitialized = false;
    }
};

// Core functions
function getVueApp() {
    const app = document.querySelector('#app')?.__vue__ ||
        window.parent?.document.querySelector('#app')?.__vue__;

    if (app?.$store && !window.storeLogged) {
        window.storeLogged = true;
        // console.log('Vuex Store found:', app.$store);
    }

    return app;
}

function findPanel() {
    const selectors = [
        '[data-test-id="element-properties-panel"]',
        '.breakdance-element-properties-panel',
        '.oxy-properties-panel'
    ];

    for (const selector of selectors) {
        const panel = document.querySelector(selector) ||
            window.parent?.document.querySelector(selector);
        if (panel) return panel;
    }
    return null;
}

function getCurrentClassesFromOxygen() {
    // First try to get classes from Vue component if available
    if (window.PlainClassesAPI && window.PlainClassesAPI.vueComponentRef) {
        const vueClasses = window.PlainClassesAPI.getClassesFromVue();
        if (vueClasses.length > 0) {
            currentElementClasses = vueClasses;
            return currentElementClasses;
        }
    }

    // If no Vue component available, try to hook into it
    if (window.PlainClassesAPI && !window.PlainClassesAPI.vueComponentRef) {
        if (window.PlainClassesAPI.hookIntoVueComponent()) {
            const vueClasses = window.PlainClassesAPI.getClassesFromVue();
            if (vueClasses.length > 0) {
                currentElementClasses = vueClasses;
                return currentElementClasses;
            }
        }
    }

    // Fallback to DOM parsing of native class tokens
    const selectors = [
        '.oxy-class-selector .oxy-class-token',
        '.oxy-class-token',
        '[data-test-id="element-studio-classname-input"] .oxy-class-token',
        '.v-combobox .oxy-class-token'
    ];

    currentElementClasses = [];

    // Try DOM selectors
    for (const selector of selectors) {
        const tokens = document.querySelectorAll(selector);
        if (tokens.length > 0) {
            const foundClasses = Array.from(tokens)
                .map(token => {
                    const nameElement = token.querySelector('.oxy-class-token-source');
                    return nameElement ? nameElement.textContent.trim() : '';
                })
                .filter(cls => cls && cls !== '⚠️ (deleted)');

            if (foundClasses.length > 0) {
                currentElementClasses = foundClasses;
                break;
            }
        }
    }

    return currentElementClasses;
}

function createComponent() {
    const panel = findPanel();
    if (!panel) return null;

    // Search in the same context as the panel (could be iframe)
    const searchContext = panel.ownerDocument || document;
    const existingComponent = searchContext.querySelector('#plain-classes-autocomplete');

    if (existingComponent) {
        return existingComponent;
    }


    // Create component with same structure as other builders
    const component = searchContext.createElement('div');
    component.id = 'plain-classes-autocomplete';
    component.className = 'plain-classes-box autocomplete-initialized';
    component.innerHTML = `
        <div id="plain-classes-autocomplete-root" style="width: 100%;">
            <label class="windauto-control-label">Plain Classes</label>
            <div id="windauto-control-label"></div>
        </div>
    `;

    // Insert before the panel
    panel.parentNode.insertBefore(component, panel);

    // Initialize React component
    const autoCompleteProps = {
        onChange: async (tags) => {
            // Debounce the onChange to prevent multiple rapid calls
            if (window.plainClassesChangeTimeout) {
                clearTimeout(window.plainClassesChangeTimeout);
            }

            window.plainClassesChangeTimeout = setTimeout(async () => {
                const classes = getCurrentClassesFromOxygen();
                const screenOptions = window.winden_autocomplete_screens || [];

                // If no screens are available, treat all classes as default
                if (screenOptions.length === 0) {
                    const areEqual = arraysEqual(classes, tags);
                    if (!areEqual) {
                        await updateOxygenClasses(tags);
                    }
                    return;
                }

                const hasScreenKey = (str) => {
                    const matchedKey = screenOptions.find(key => str.startsWith(`${key}:`));
                    return matchedKey || null;
                };

                const hasScreenClasses = tags.some(tag => hasScreenKey(tag));

                if (hasScreenClasses) {
                    // Screen-specific class change, update immediately
                    await updateOxygenClasses(tags);
                } else {
                    // Regular class change, compare default classes
                    const defaultClasses = classes.filter(cls => !hasScreenKey(cls));
                    const defaultTags = tags.filter(tag => !hasScreenKey(tag));
                    const areEqual = arraysEqual(defaultClasses, defaultTags);

                    if (!areEqual) {
                        await updateOxygenClasses(tags);
                    }
                }
            }, 50);
        },
        defaultTags: (() => {
            const classes = getCurrentClassesFromOxygen() ?? [];
            const screenOptions = window.winden_autocomplete_screens || [];

            // If no screens are available, return all classes as default
            if (screenOptions.length === 0) {
                return classes;
            }

            // Filter out screen-specific classes from default tags
            // The component will handle screen-specific classes internally
            const defaultClasses = classes.filter(cls => {
                const hasScreenKey = screenOptions.find(key => cls.startsWith(`${key}:`));
                return !hasScreenKey;
            });

            return defaultClasses;
        })(),
        // Add screen management props
        screens: window.winden_autocomplete_screens || [],
        isDark: false, // Oxygen6 uses light theme
        onScreenChange: () => {
            // The component handles screen-specific classes internally
        }
    };

    const targetElement = searchContext.querySelector('#windauto-control-label');
    if (targetElement) {
        const root = createRoot(targetElement);
        root.render(<WindenAutocompleteWithScreens {...autoCompleteProps} />);
    }

    return component;
}

function updateComponentDisplay() {
    const panel = findPanel();
    if (!panel) return;

    // Search in the same context as the panel (could be iframe)
    const searchContext = panel.ownerDocument || document;
    const component = searchContext.querySelector('#plain-classes-autocomplete');

    if (!component) {
        createComponent();

        // Wait for component to be created and then update
        setTimeout(() => {
            updateComponentDisplay();
        }, 100);
        return;
    }

    // Update current classes from Oxygen
    getCurrentClassesFromOxygen();

    // Dispatch event to update React component
    window.dispatchEvent(new CustomEvent('activeElementClassesChange', {
        detail: { newClasses: currentElementClasses }
    }));

    // Also try to directly update the React component if possible
    const reactRoot = component.querySelector('#windauto-control-label');
    if (reactRoot && reactRoot._reactInternalFiber) {
        // Force React component to re-render with new classes
        window.dispatchEvent(new CustomEvent('forceReactUpdate', {
            detail: { classes: currentElementClasses }
        }));
    }
}

// Utility function for array comparison
function arraysEqual(arr1, arr2) {
    if (arr1 === arr2) return true;
    if (!Array.isArray(arr1) || !Array.isArray(arr2) || arr1.length !== arr2.length)
        return false;
    return arr1.sort().toString() === arr2.sort().toString();
}

async function updateOxygenClasses(classes) {
    // Throttle rapid updates
    const now = Date.now();
    if (now - lastUpdateTime < UPDATE_THROTTLE) {
        return false;
    }
    lastUpdateTime = now;

    // Use native API if available
    if (window.PlainClassesAPI && window.PlainClassesAPI.vueComponentRef) {
        try {
            // Remove duplicates from the input array
            const uniqueClasses = [...new Set(classes)];

            // Separate default classes from screen-specific classes
            const defaultClasses = [];
            const screenClasses = [];

            uniqueClasses.forEach(className => {
                // Check if class has screen prefix (e.g., sm:, md:, lg:, xl:, 2xl:)
                const screenMatch = className.match(/^(sm|md|lg|xl|2xl):(.+)/);
                if (screenMatch) {
                    screenClasses.push(className);
                } else {
                    defaultClasses.push(className);
                }
            });

            // Clear existing classes first
            await window.PlainClassesAPI.vueComponentRef.updateClasses([]);

            // Add default classes first, then screen-specific classes
            const classIds = [];
            for (const className of [...defaultClasses, ...screenClasses]) {
                const existingClass = window.PlainClassesAPI.vueComponentRef.createClassIfNeeded(className);
                if (existingClass && existingClass.id) {
                    classIds.push(existingClass.id);
                }
            }

            // Update all classes at once
            await window.PlainClassesAPI.vueComponentRef.updateClasses(classIds);

            // Wait for Vue to update the DOM, then trigger recompilation
            // The iframe needs time to sync the class changes from the Vue model
            setTimeout(() => {
                triggerRecompile();
            }, 300);

            return true;
        } catch (error) {
            console.error('Plain Classes: Error updating via native API:', error);
        }
    }

    return false;
}

// Trigger Tailwind recompilation with retry
function triggerRecompile(retryCount = 0) {
    const maxRetries = 3;

    try {
        // The watcher sets window.compile on parent window from iframe context
        if (window.compile) {
            Promise.resolve(window.compile({ force: true })).catch(err => {
                console.error('[Plain Classes] compile() error:', err);
            });
            return;
        }

        // Try to find and access the iframe directly
        const iframeSelectors = [
            'iframe[src*="breakdance_iframe"]',
            'iframe[src*="oxygen"]',
            'iframe.breakdance-iframe',
            'iframe#preview-iframe',
            'iframe[name="editor-canvas"]'
        ];

        let targetIframe = null;
        for (const selector of iframeSelectors) {
            targetIframe = document.querySelector(selector);
            if (targetIframe) break;
        }

        // Try to access iframe's contentWindow
        if (targetIframe && targetIframe.contentWindow) {
            const iframeWindow = targetIframe.contentWindow;

            // The watcher exposes window.compile() - call with force: true
            if (iframeWindow.compile) {
                iframeWindow.compile({ force: true });
                return;
            }

            // If compile not ready yet, retry after a delay
            if (retryCount < maxRetries) {
                setTimeout(() => triggerRecompile(retryCount + 1), 200);
                return;
            }

            // If no compile function after retries, try to trigger a DOM mutation
            if (iframeWindow.document) {
                const body = iframeWindow.document.body;
                if (body) {
                    // Add and remove a data attribute to trigger MutationObserver
                    body.setAttribute('data-winden-recompile', Date.now());
                    setTimeout(() => body.removeAttribute('data-winden-recompile'), 10);
                    return;
                }
            }
        } else {
            // Retry if iframe not found yet
            if (retryCount < maxRetries) {
                setTimeout(() => triggerRecompile(retryCount + 1), 200);
                return;
            }
        }

        // If no compile function found, rely on MutationObserver to pick up DOM changes

    } catch (error) {
        console.error('[Plain Classes] Error triggering recompile:', error);
    }
}

function init() {
    if (window.plainClassesInitialized) return;
    window.plainClassesInitialized = true;

    // Wait for autocomplete data from iframe (set by cdn_scripts_autocomplete)
    // The iframe sets window.parent.winden_autocomplete when data is ready
    const waitForAutocomplete = () => {
        return new Promise((resolve) => {
            // Check if already available
            if (window.winden_autocomplete && Array.isArray(window.winden_autocomplete) && window.winden_autocomplete.length > 0) {
                resolve();
                return;
            }

            let attempts = 0;
            const maxAttempts = 50; // 5 seconds max wait

            const checkInterval = setInterval(() => {
                attempts++;
                if (window.winden_autocomplete && Array.isArray(window.winden_autocomplete) && window.winden_autocomplete.length > 0) {
                    clearInterval(checkInterval);
                    resolve();
                } else if (attempts >= maxAttempts) {
                    clearInterval(checkInterval);
                    console.warn('Plain Classes: Timeout waiting for autocomplete data');
                    resolve();
                }
            }, 100);
        });
    };

    // Wait for autocomplete then continue initialization
    waitForAutocomplete().then(() => {
        initAfterAutocomplete();
    });
}

function initAfterAutocomplete() {
    // Ensure screens data is available for breakpoints
    if (!window.winden_autocomplete_screens || window.winden_autocomplete_screens.length === 0) {
        // console.log('Plain Classes: No screens data found, extracting from Tailwind config');

        // Try to get screens from Tailwind config
        if (window.tailwind?.config?.theme?.screens) {
            window.winden_autocomplete_screens = Object.keys(window.tailwind.config.theme.screens);
            // console.log('Plain Classes: Extracted screens from tailwind.config:', window.winden_autocomplete_screens);
        }
        // Try to get screens from full config
        else if (window.fullTailwindConfig?.theme?.screens) {
            window.winden_autocomplete_screens = Object.keys(window.fullTailwindConfig.theme.screens);
            // console.log('Plain Classes: Extracted screens from fullTailwindConfig:', window.winden_autocomplete_screens);
        }
        // Fallback to default screens
        else {
            window.winden_autocomplete_screens = ['sm', 'md', 'lg', 'xl', '2xl'];
            // console.log('Plain Classes: Using default screens:', window.winden_autocomplete_screens);
        }
    }


    // console.log('Plain Classes: Initializing native integration...');

    // Clean up any existing components from previous loads
    const existingComponents = document.querySelectorAll('#plain-classes-autocomplete');
    existingComponents.forEach(comp => comp.remove());

    // Create initial component
    createComponent();

    // Hook into existing Vue component
    setTimeout(() => {
        if (window.PlainClassesAPI.hookIntoVueComponent()) {
            // console.log('Plain Classes: Successfully hooked into native Oxygen6 component');
        } else {
            // console.log('Plain Classes: Could not find native Oxygen6 component, retrying...');
            setTimeout(() => window.PlainClassesAPI.hookIntoVueComponent(), 2000);
        }
    }, 1000);

    // Listen for Vue element changes
    window.addEventListener('vue-element-changed', () => {
        // Re-hook into Vue component for the new element
        setTimeout(() => {
            window.PlainClassesAPI.hookIntoVueComponent();
        }, 100);

        // Update component display with retry mechanism
        setTimeout(() => {
            updateComponentDisplay();

            // Retry after a short delay to ensure classes are loaded
            setTimeout(() => {
                const classes = getCurrentClassesFromOxygen();
                if (classes.length > 0) {
                    window.dispatchEvent(new CustomEvent('activeElementClassesChange', {
                        detail: { newClasses: classes }
                    }));
                }
            }, 200);
        }, 50);
    });

    // Listen for sync events from Vue
    window.addEventListener('plain-classes-synced-from-vue', () => {
        updateComponentDisplay();
    });

    // Listen for drag and drop events from the component
    window.addEventListener('activeElementClassesChange', (event) => {
        // console.log('Plain Classes: Active element classes changed (drag/drop):', event.detail);
        if (event.detail.newClasses) {
            // Update Oxygen immediately for drag and drop operations
            updateOxygenClasses(event.detail.newClasses);
        }
    });

    // Set up watchers
    const app = getVueApp();
    if (app?.$store) {
        // Watch element selection changes
        app.$store.watch(
            (state) => state.ui?.activeElementId,
            (newId, oldId) => {
                if (newId !== oldId) {
                    // console.log('Plain Classes: Active element changed from', oldId, 'to', newId);

                    // Re-hook into Vue component for the new element
                    setTimeout(() => {
                        window.PlainClassesAPI.hookIntoVueComponent();
                        // Update component display
                        updateComponentDisplay();
                    }, 100);
                }
            }
        );

        // Watch properties panel state
        app.$store.watch(
            (state) => [state.ui?.leftSidebarState, state.ui?.rightSidebarState],
            ([left, right]) => {
                if (left === 'elementproperties' || right === 'elementproperties') {
                    setTimeout(() => {
                        // Only create component if it doesn't exist
                        const panel = findPanel();
                        const searchContext = panel?.ownerDocument || document;
                        const existingComponent = searchContext.querySelector('#plain-classes-autocomplete');

                        if (!existingComponent) {
                            createComponent();
                        } else {
                            updateComponentDisplay();
                        }

                        // Re-hook into Vue component if needed
                        if (!window.PlainClassesAPI.vueComponentRef) {
                            window.PlainClassesAPI.hookIntoVueComponent();
                        }
                    }, 100);
                }
            }
        );
    }

    // Retry mechanism
    let retries = 0;
    const retry = () => {
        const panel = findPanel();
        const searchContext = panel?.ownerDocument || document;
        const existingComponent = searchContext.querySelector('#plain-classes-autocomplete');

        if (retries < 5 && !existingComponent) {
            retries++;
            setTimeout(() => {
                createComponent();
                retry();
            }, 200);
        }
    };
    setTimeout(retry, 200);
}

// Initialize
init();
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
}