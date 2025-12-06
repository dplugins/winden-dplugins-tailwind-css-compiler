import React from 'react';
import ReactDOM from 'react-dom';
import WindenAutocompleteWithScreens from '../../../../src/plain-classes/winauto-component/WindenAutocompleteWithScreens';
import './plain-classes.scss';

let _tags = [];
let _initialized = false;
let _reactRoot = null; // Store the React root for proper cleanup and re-rendering

// Use React 18's createRoot if available, otherwise fall back to legacy render
const createReactRoot = (container) => {
    // Check if React 18's createRoot is available
    if (ReactDOM.createRoot) {
        return ReactDOM.createRoot(container);
    }
    // Fallback to legacy render for older React versions
    return {
        render: (element) => ReactDOM.render(element, container),
        unmount: () => ReactDOM.unmountComponentAtNode(container)
    };
};

function dispatchActiveElementClassesChange(newClasses) {
    const event = new CustomEvent('activeElementClassesChange', { detail: { newClasses } });
    window.dispatchEvent(event);
}

// Utility functions that can be reused elsewhere
const arraysEqual = (arr1, arr2) => {
    if (arr1 === arr2) return true;
    if (!Array.isArray(arr1) || !Array.isArray(arr2) || arr1.length !== arr2.length)
        return false;

    return arr1.sort().toString() === arr2.sort().toString();
};

const BASE36_CHARS = '0123456789abcdefghijklmnopqrstuvwxyz';

const generateRandomString = (length) => {
    let result = '';
    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);
    for (let i = 0; i < length; i++) {
        result += BASE36_CHARS[randomValues[i] % BASE36_CHARS.length];
    }
    return result;
};

const generateId = (commonStore) => {
    const idSet = new Set(commonStore.globalClasses.map(function(e) { return e.id }));
    let id;
    do {
        id = 'swk' + generateRandomString(8);
    } while (idSet.has(id));
    return id;
};

// A helper to subscribe to a store property and call a callback after the next tick.
const subscribeToStoreProperty = (commonInstance, commonStore, expression, callback) => {
    return commonInstance.$watch(
        () => expression(commonStore),
        (newVal, oldVal) => {
            commonInstance.$nextTick(() => {
                callback(newVal, oldVal);
            });
        },
        { deep: true }
    );
};

function loadPlainClasses(commonContainer) {
    // Wait for Vue instance to be available
    if (!commonContainer || !commonContainer._vnode || !commonContainer._vnode.component || !commonContainer._vnode.component.proxy) {
        return null;
    }

    const commonInstance = commonContainer._vnode.component.proxy;

    // Wait for Vue state to be available
    if (!commonInstance.$_state) {
        return null;
    }

    const commonStore = commonInstance.$_state;

    // Subscribe when the active panel changes.
    const subscribePanel = () => {
        const panelChangeCallback = (currentPanel, previousPanel) => {
            if (currentPanel === 'element') {
                mountComponent();
            } else {
                unmountComponent();
            }
        };

        return subscribeToStoreProperty(
            commonInstance,
            commonStore,
            (store) => store.activePanel,
            panelChangeCallback
        );
    };

    // Subscribe when the active element changes.
    const subscribeElements = () => {
        const elementChangeCallback = (newVal, oldVal) => {
            updateComponent();
        };

        return subscribeToStoreProperty(
            commonInstance,
            commonStore,
            (store) => store.activeElement,
            elementChangeCallback
        );
    };

    // Subscribe when global classes change.
    const subscribeClasses = () => {
        const classesChangeCallback = (newVal, oldVal) => {
            updateComponent();
        };

        return subscribeToStoreProperty(
            commonInstance,
            commonStore,
            (store) => store.globalClasses,
            classesChangeCallback
        );
    };

    // Monitor changes in #bricks-panel-header element
    const subscribePanelHeader = () => {
        const waitForPanelHeader = () => {
            const targetElement = document.querySelector('#bricks-panel-header');
            if (!targetElement) {
                setTimeout(waitForPanelHeader, 500);
                return;
            }

            const observer = new MutationObserver((mutations) => {
                let shouldUpdate = false;
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList' ||
                        mutation.type === 'attributes' ||
                        mutation.type === 'characterData') {
                        shouldUpdate = true;
                    }
                });

                if (shouldUpdate) {
                    updateComponent();
                }
            });

            // Observe changes to the element and its descendants
            observer.observe(targetElement, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeOldValue: true,
                characterData: true,
                characterDataOldValue: true
            });

            return observer;
        };

        waitForPanelHeader();
    };

    // Monitor when #bricks-panel-sticky appears and disappears
    const subscribePanelSticky = () => {
        const checkAndMountComponent = () => {
            const panel = document.querySelector("#bricks-panel-sticky");
            const existingRoot = document.querySelector('#plain-classes-autocomplete-root');

            if (panel && !existingRoot) {
                performMount();
            } else if (!panel && existingRoot) {
                _initialized = false;
                _reactRoot = null;
            }
        };

        // Create observer for the document body to watch for #bricks-panel-sticky changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    // Check if any added nodes contain or are #bricks-panel-sticky
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.id === 'bricks-panel-sticky' || node.querySelector('#bricks-panel-sticky')) {
                                setTimeout(checkAndMountComponent, 100); // Small delay to ensure DOM is ready
                            }
                        }
                    });

                    // Check if any removed nodes contain or are #bricks-panel-sticky
                    mutation.removedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.id === 'bricks-panel-sticky' || node.querySelector('#bricks-panel-sticky')) {
                                _initialized = false;
                                _reactRoot = null;
                            }
                        }
                    });
                }
            });
        });

        // Observe changes to the entire document body
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Initial check
        checkAndMountComponent();

        return observer;
    };

    const mountComponent = () => {
        if (commonStore.activeElement) {
            performMount();
            return;
        }
        // Use Vue's reactive $watch to wait for activeElement.
        const unwatch = commonInstance.$watch(
            () => commonStore.activeElement,
            (newVal) => {
                if (newVal) {
                    unwatch();
                    performMount();
                }
            }
        );
    };

    const performMount = () => {
        if (_initialized && _reactRoot) {
            const classes = getActiveElementClasses();
            if (classes) {
                dispatchActiveElementClassesChange(classes);
            }
        } else {
            const panel = document.querySelector("#bricks-panel-sticky");
            if (panel) {
                // Remove existing component if it exists
                const existingRoot = document.querySelector('#plain-classes-autocomplete-root');
                if (existingRoot) {
                    existingRoot.remove();
                }

                panel.insertAdjacentHTML(
                    "afterbegin",
                    `
                    <div
                        id="plain-classes-autocomplete-root"
                        style="width: 100%; padding: 0 var(--builder-spacing);">
                        <label class="windauto-control-label">Plain Classes</label>
                        <div id="windauto-control-label"></div>
                    </div>
                    `
                );

                const autoCompleteProps = {
                    onChange: (tags) => {
                        _tags = [...tags];
                        const classes = getActiveElementClasses();
                        if (!arraysEqual(classes, _tags)) {
                            setActiveElementClasses(_tags);
                        }
                    },
                    defaultTags: getActiveElementClasses() ?? [],
                };

                const targetElement = document.querySelector('#windauto-control-label');
                if (targetElement) {
                    _reactRoot = createReactRoot(targetElement);
                    _reactRoot.render(<WindenAutocompleteWithScreens {...autoCompleteProps} />);
                    _initialized = true;
                }
            }
        }
    };

    const unmountComponent = () => {
        // Placeholder for unmount logic if needed
    };

    const updateComponent = () => {
        // Check if component exists and panel is still there
        const panel = document.querySelector("#bricks-panel-sticky");
        const existingRoot = document.querySelector('#plain-classes-autocomplete-root');

        if (panel && existingRoot && _reactRoot) {
            const classes = getActiveElementClasses();
            if (classes) {
                dispatchActiveElementClassesChange(classes);
            }
        } else if (panel && !existingRoot) {
            performMount();
        }
    };

    // Debounce helper for compile trigger
    let compileDebounceTimer = null;
    const triggerCompile = () => {
        if (compileDebounceTimer) {
            clearTimeout(compileDebounceTimer);
        }
        compileDebounceTimer = setTimeout(() => {
            // Get the Bricks iframe where the compiler runs
            const bricksIframe = document.getElementById('bricks-builder-iframe');
            if (bricksIframe && bricksIframe.contentWindow) {
                const iframeWindow = bricksIframe.contentWindow;

                // Check if compile function exists in the iframe
                if (iframeWindow.compile && typeof iframeWindow.compile === 'function') {
                    iframeWindow.compile();
                }
            }
        }, 300); // 300ms debounce
    };

    const setActiveElementClasses = (classNames) => {
        const bricksIframe = document.getElementById('bricks-builder-iframe');
        if (bricksIframe) {
            const globalIframeProps = bricksIframe?.contentDocument?.querySelector('.brx-body')
                ?.__vue_app__?.config?.globalProperties;
            if (globalIframeProps) {
                const activeEl = globalIframeProps.$_activeElement.value;
                if (activeEl) {
                    const activeElNode = globalIframeProps.$_getElementNode(activeEl);
                    const activeElClasses = globalIframeProps.$_getElementClasses(activeEl);
                    // Reset the classes. "is-active-element" is a constant class.
                    activeElNode.classList.value = 'is-active-element ' + activeElClasses.join(' ');
                    commonStore.activeElement.settings._cssGlobalClasses = [];

                    classNames.forEach((className) => {
                        let classInstance = commonStore.globalClasses.find(c => c.name === className);
                        if (!classInstance) {
                            classInstance = {
                                id: generateId(commonStore),
                                name: className,
                                settings: []
                            };
                            commonStore.globalClasses.push(classInstance);
                        }
                        commonStore.activeElement.settings._cssGlobalClasses.push(classInstance.id);
                        setTimeout(() => {
                            activeElNode.classList.add(className);
                        }, 50);
                    });

                    // Trigger CSS compilation after classes are updated
                    triggerCompile();
                }
            }
        }
    };

    const getActiveElementClasses = () => {
        if (!commonStore.activeElement) return [];
        return commonStore.activeElement.settings._cssGlobalClasses?.map((classCode) => {
            return commonInstance.$_getGlobalClass(classCode)?.name;
        }) || [];
    };

    return {
        subscribePanel,
        subscribeElements,
        subscribeClasses,
        subscribePanelHeader,
        subscribePanelSticky
    };
}

function initPlainClasses() {
    if (!window.frameElement) {
        // Wait for DOM to be ready
        const waitForContainer = () => {
            const commonContainer = document.querySelector('.brx-body');
            if (!commonContainer) {
                // Retry after a short delay
                setTimeout(waitForContainer, 100);
                return;
            }

            const result = loadPlainClasses(commonContainer);
            if (result) {
                const { subscribePanel, subscribeElements, subscribeClasses, subscribePanelHeader, subscribePanelSticky } = result;
                subscribePanel();
                subscribeElements();
                subscribeClasses();
                subscribePanelHeader();
                subscribePanelSticky();
            } else {
                // Retry if Vue instance wasn't ready
                setTimeout(waitForContainer, 100);
            }
        };

        waitForContainer();
    }
}

initPlainClasses();
