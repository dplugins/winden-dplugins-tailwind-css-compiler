// Plain Classes for Oxygen 6 - Vue-Native Plugin Architecture

// Vue Plugin for Plain Classes - Native Vue Integration
const PlainClassesPlugin = {
    install(Vue, options = {}) {
        // Add global mixin to all Vue components
        Vue.mixin({
            data() {
                return {
                    plainClassesState: {
                        isVisible: false,
                        currentClasses: [],
                        isSynced: false
                    }
                };
            },
            
            methods: {
                // Native Vue method to show/hide plain classes panel
                togglePlainClasses() {
                    this.plainClassesState.isVisible = !this.plainClassesState.isVisible;
                    if (this.plainClassesState.isVisible) {
                        this.updatePlainClassesDisplay();
                    }
                },
                
                // Native Vue method to update classes display
                updatePlainClassesDisplay() {
                    if (this.elementClasses) {
                        this.plainClassesState.currentClasses = this.elementClasses;
                        this.plainClassesState.isSynced = true;
                    }
                },
                
                // Native Vue method to add classes
                async addPlainClasses(classNames) {
                    if (!this.elementId) return false;
                    
                    const newClasses = Array.isArray(classNames) ? classNames : [classNames];
                    const currentClasses = this.elementClasses || [];
                    const allClasses = [...new Set([...currentClasses, ...newClasses])];
                    
                    try {
                        await this.updateClasses(allClasses);
                        this.plainClassesState.currentClasses = allClasses;
                        return true;
                    } catch (error) {
                        console.error('Plain Classes: Error adding classes:', error);
                        return false;
                    }
                },
                
                // Native Vue method to remove classes
                async removePlainClass(className) {
                    if (!this.elementId) return false;
                    
                    const currentClasses = this.elementClasses || [];
                    const filteredClasses = currentClasses.filter(cls => cls !== className);
                    
                    try {
                        await this.updateClasses(filteredClasses);
                        this.plainClassesState.currentClasses = filteredClasses;
                        return true;
                    } catch (error) {
                        console.error('Plain Classes: Error removing class:', error);
                        return false;
                    }
                }
            },
            
            // Watch for element changes and update plain classes
            watch: {
                elementId: {
                    handler(newId, oldId) {
                        if (newId !== oldId) {
                            this.updatePlainClassesDisplay();
                        }
                    },
                    immediate: true
                },
                
                elementClasses: {
                    handler(newClasses) {
                        this.plainClassesState.currentClasses = newClasses || [];
                    },
                    deep: true
                }
            }
        });
        
        // Add global property to Vue prototype
        Vue.prototype.$plainClasses = {
            show() {
                this.togglePlainClasses();
            },
            
            hide() {
                this.plainClassesState.isVisible = false;
            },
            
            add(className) {
                return this.addPlainClasses(className);
            },
            
            remove(className) {
                return this.removePlainClass(className);
            },
            
            getClasses() {
                return this.plainClassesState.currentClasses;
            }
        };
        
        // Register global component for plain classes panel
        Vue.component('PlainClassesPanel', {
            name: 'PlainClassesPanel',
            template: `
                <div v-if="isVisible" class="plain-classes-panel" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; z-index: 10000; min-width: 400px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h3 style="margin: 0; color: #333;">Plain Classes</h3>
                        <button @click="hide" style="background: none; border: none; font-size: 18px; cursor: pointer;">×</button>
                    </div>
                    
                    <div v-if="currentClasses.length > 0">
                        <h4>Current Classes:</h4>
                        <div style="margin: 10px 0;">
                            <span v-for="className in currentClasses" :key="className" 
                                  class="class-tag" 
                                  @click="removeClass(className)"
                                  style="display: inline-block; background: #e1f5fe; color: #01579b; padding: 4px 8px; margin: 2px; border-radius: 12px; font-size: 12px; cursor: pointer; border: 1px solid #b3e5fc;">
                                {{ className }} ×
                            </span>
                        </div>
                    </div>
                    
                    <div style="margin-top: 15px;">
                        <input v-model="newClassName" 
                               @keyup.enter="addClass"
                               placeholder="Enter new class name..." 
                               style="width: 100%; padding: 8px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 4px;">
                        <button @click="addClass" 
                                style="width: 100%; padding: 10px; background: #007cba; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            Add Class
                        </button>
                    </div>
                </div>
            `,
            
            data() {
                return {
                    newClassName: ''
                };
            },
            
            computed: {
                isVisible() {
                    return this.$parent.plainClassesState.isVisible;
                },
                
                currentClasses() {
                    return this.$parent.plainClassesState.currentClasses;
                }
            },
            
            methods: {
                hide() {
                    this.$parent.plainClassesState.isVisible = false;
                },
                
                async addClass() {
                    if (this.newClassName.trim()) {
                        await this.$parent.addPlainClasses(this.newClassName.trim());
                        this.newClassName = '';
                    }
                },
                
                async removeClass(className) {
                    if (confirm(`Remove class "${className}"?`)) {
                        await this.$parent.removePlainClass(className);
                    }
                }
            }
        });
    }
};

// Global state
if (typeof currentElementClasses === 'undefined') {
    var currentElementClasses = [];
}

// Vue-Native Integration Functions
function injectPlainClassesIntoOxygen() {
    const app = getVueApp();
    if (!app) return false;
    
    // Get Vue constructor from the app
    let Vue = app.constructor;
    
    // Fallback: try to get Vue from various sources
    if (!Vue) {
        // Try window.Vue (if available)
        if (window.Vue) {
            Vue = window.Vue;
        }
        // Try from app.$options
        else if (app.$options && app.$options._base) {
            Vue = app.$options._base;
        }
        // Try from app.$root
        else if (app.$root && app.$root.constructor) {
            Vue = app.$root.constructor;
        }
        else {
            console.error('Plain Classes: Vue constructor not found');
            return false;
        }
    }
    
    // Find the ClassDropdown component and inject our panel
    const classDropdown = findComponentByNameOrProps(app, (c) =>
        c.$options?.name === 'ClassDropdown' ||
        (c.updateClasses && c.elementClasses && c.availableClasses && c.createFromNameAndSelect)
    );
    
    if (classDropdown) {
        // Extend the ClassDropdown component with plain classes functionality
        if (!classDropdown.plainClassesAdded) {
            // Add plain classes methods to the ClassDropdown component
            classDropdown.addPlainClasses = async function(classNames) {
                const newClasses = Array.isArray(classNames) ? classNames : [classNames];
                const currentClasses = this.elementClasses || [];
                const allClasses = [...new Set([...currentClasses, ...newClasses])];
                
                try {
                    await this.updateClasses(allClasses);
                    return true;
                } catch (error) {
                    console.error('Plain Classes: Error adding classes:', error);
                    return false;
                }
            };
            
            classDropdown.removePlainClass = async function(className) {
                const currentClasses = this.elementClasses || [];
                const filteredClasses = currentClasses.filter(cls => cls !== className);
                
                try {
                    // Use Oxygen's existing updateClasses function
                    this.updateClasses(filteredClasses);
                    return true;
                } catch (error) {
                    console.error('Plain Classes: Error removing class:', error);
                    return false;
                }
            };
            
            // Add plain classes state to the component
            classDropdown.plainClassesState = {
                isVisible: false,
                currentClasses: []
            };
            
            // Create and inject the UI panel
            const panelHTML = `
                <div id="plain-classes-panel" style="display: none; position: absolute; top: 0; right: 0; background: white; border: 1px solid #ddd; border-radius: 4px; padding: 15px; z-index: 1000; min-width: 300px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h4 style="margin: 0; color: #333;">Plain Classes</h4>
                        <button id="plain-classes-close" style="background: none; border: none; font-size: 16px; cursor: pointer;">×</button>
                    </div>
                    
                    <div id="plain-classes-tags" style="margin: 10px 0;">
                        <!-- Class tags will be inserted here -->
                    </div>
                    
                    <div style="margin-top: 15px;">
                        <input id="plain-classes-input" 
                               placeholder="Enter new class name..." 
                               style="width: 100%; padding: 8px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 4px;">
                        <button id="plain-classes-add" 
                                style="width: 100%; padding: 10px; background: #007cba; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            Add Class
                        </button>
                    </div>
                </div>
            `;
            
            // Insert the panel into the ClassDropdown element
            classDropdown.$el.insertAdjacentHTML('beforeend', panelHTML);
            
            // Add a button to show the panel
            const showButton = document.createElement('button');
            showButton.textContent = 'Plain Classes';
            showButton.style.cssText = 'margin: 5px; padding: 8px 12px; background: #007cba; color: white; border: none; border-radius: 4px; cursor: pointer;';
            showButton.onclick = () => {
                const panel = classDropdown.$el.querySelector('#plain-classes-panel');
                if (panel) {
                    panel.style.display = 'block';
                    updatePlainClassesDisplay();
                }
            };
            
            // Find a good place to insert the button
            const dropdownContainer = classDropdown.$el.closest('.oxy-properties-panel') || classDropdown.$el;
            dropdownContainer.appendChild(showButton);
            
            // Add event listeners
            const panel = classDropdown.$el.querySelector('#plain-classes-panel');
            const closeBtn = panel.querySelector('#plain-classes-close');
            const addBtn = panel.querySelector('#plain-classes-add');
            const input = panel.querySelector('#plain-classes-input');
            
            closeBtn.onclick = () => {
                panel.style.display = 'none';
            };
            
            addBtn.onclick = async () => {
                const className = input.value.trim();
                if (className) {
                    const success = await classDropdown.addPlainClasses(className);
                    if (success) {
                        input.value = '';
                        updatePlainClassesDisplay();
                    }
                }
            };
            
            input.onkeyup = (e) => {
                if (e.key === 'Enter') {
                    addBtn.click();
                }
            };
            
            // Function to update the display
            function updatePlainClassesDisplay() {
                const tagsContainer = panel.querySelector('#plain-classes-tags');
                const classes = classDropdown.elementClasses || [];
                
                if (classes.length > 0) {
                    const tagsHTML = classes.map(className => 
                        `<span class="class-tag" data-class="${className}" 
                               style="display: inline-block; background: #e1f5fe; color: #01579b; padding: 4px 8px; margin: 2px; border-radius: 12px; font-size: 12px; cursor: pointer; border: 1px solid #b3e5fc;">
                            ${className} ×
                        </span>`
                    ).join('');
                    tagsContainer.innerHTML = tagsHTML;
                    
                    // Add click handlers for remove buttons
                    tagsContainer.querySelectorAll('.class-tag').forEach(tag => {
                        tag.onclick = async () => {
                            const className = tag.getAttribute('data-class');
                            if (confirm(`Remove class "${className}"?`)) {
                                const success = await classDropdown.removePlainClass(className);
                                if (success) {
                                    updatePlainClassesDisplay();
                                }
                            }
                        };
                    });
                } else {
                    tagsContainer.innerHTML = '<span style="color: #666; font-style: italic;">No classes found</span>';
                }
            }
            
            classDropdown.plainClassesAdded = true;
            // console.log('Plain Classes: Vue-native component injected successfully');
            return true;
        }
    }
    
    return false;
}

// Generic recursive component finder
function findComponentByNameOrProps(component, matchFn, depth = 0) {
    if (!component || depth > 10) return null;
    if (matchFn(component)) return component;

    if (component.$children?.length > 0) {
        for (const child of component.$children) {
            const found = findComponentByNameOrProps(child, matchFn, depth + 1);
            if (found) return found;
        }
    }
    return null;
}

// Sync API for working with existing Vue components (non-intrusive)
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
        
        // Try Vue Devtools-compatible inspection methods first (faster)
        this.vueComponentRef = this.findComponentViaDevtools(app) || 
                               findComponentByNameOrProps(app, (c) =>
                                   c.$options?.name === 'ClassDropdown' ||
                                   (c.updateClasses && c.elementClasses && c.availableClasses && c.createFromNameAndSelect)
                               );
        
        if (this.vueComponentRef) {
            this.setupComponentWatchers();
            this.isInitialized = true;
            return true;
        }
        
        return false;
    },
    
    // Vue Devtools-compatible component discovery
    findComponentViaDevtools(app) {
        // Method 1: Check $root.$children for stable references
        if (app.$root?.$children) {
            for (const child of app.$root.$children) {
                        if (child.$options?.name === 'ClassDropdown' ||
            (child.updateClasses && child.elementClasses && child.availableClasses && child.createFromNameAndSelect)) {
            return child;
        }
            }
        }
        
        // Method 2: Check app.$refs for named references
        if (app.$refs) {
            for (const [key, ref] of Object.entries(app.$refs)) {
                if (ref && typeof ref === 'object' && ref.$options?.name === 'ClassDropdown') {
                    return ref;
                }
            }
        }
        
        // Method 3: Check if app itself has the required properties
        if (app.updateClasses && app.elementClasses && app.availableClasses && app.createFromNameAndSelect) {
            return app;
        }
        
        // Method 4: Check $parent chain for component
        let current = app;
        let depth = 0;
        while (current.$parent && depth < 5) {
            current = current.$parent;
            if (current.$options?.name === 'ClassDropdown' ||
                (current.updateClasses && current.elementClasses && current.availableClasses && current.createFromNameAndSelect)) {
                return current;
            }
            depth++;
        }
        
        // Method 5: Check if Oxygen exposes components in global scope
        if (window.oxygenComponents) {
            for (const component of window.oxygenComponents) {
                if (component.$options?.name === 'ClassDropdown' ||
                    (component.updateClasses && component.elementClasses && component.availableClasses && component.createFromNameAndSelect)) {
                    return component;
                }
            }
        }
        
        return null;
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
        
        const elementClasses = this.vueComponentRef.elementClasses || [];
        const availableClasses = this.vueComponentRef.availableClasses || [];
        
        // Convert class IDs to names
        return elementClasses
            .map(id => availableClasses.find(c => c.id === id))
            .filter(cls => cls)
            .map(cls => cls.name);
    },
    
    // Sync classes from plain plugin to Vue (non-intrusive)
    async syncToVue(classNames) {
        if (!this.vueComponentRef) return false;
        
        try {
            let availableClasses = this.vueComponentRef.availableClasses || [];
            const classIds = [];
            

            
            // Process each class name
            for (const className of classNames) {
                let existingClass = availableClasses.find(c => c.name === className);
                
                if (!existingClass) {
                    // Create new class if it doesn't exist
                    existingClass = this.vueComponentRef.createClassIfNeeded(className);
                    
                    // Wait a bit for the class to be added to the store
                    await new Promise(resolve => setTimeout(resolve, 50));
                    
                    // Refresh available classes
                    availableClasses = this.vueComponentRef.availableClasses || [];
                    
                    // Re-find the class in case the reference changed
                    existingClass = availableClasses.find(c => c.name === className) || existingClass;
                }
                
                if (existingClass && existingClass.id) {
                    classIds.push(existingClass.id);
                }
            }
            

            
            // Use a more direct approach to avoid the closeMenu error
            if (this.vueComponentRef.elementId) {
                // Try to access setElementSelectors from global scope
                const setElementSelectors = window.setElementSelectors || 
                                           this.vueComponentRef.setElementSelectors ||
                                           (window.parent && window.parent.setElementSelectors);
                
                if (setElementSelectors) {
                    setElementSelectors(this.vueComponentRef.elementId, classIds);
                } else {
                    // Fallback: temporarily disable closeMenu to avoid the error
                    const originalCloseMenu = this.vueComponentRef.closeMenu;
                    this.vueComponentRef.closeMenu = () => {
                        // Intercept and ignore closeMenu calls
                    };
                    
                    try {
                        this.vueComponentRef.updateClasses(classIds);
                    } finally {
                        // Restore original closeMenu
                        this.vueComponentRef.closeMenu = originalCloseMenu;
                    }
                }
            }
            
            return true;
            
        } catch (error) {
            console.error('Plain Classes API: Error syncing to Vue:', error);
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
        debounceUpdatePlainClasses(0);
        
        // Dispatch event for other listeners
        window.dispatchEvent(new CustomEvent('plain-classes-synced-from-vue', {
            detail: { classes: classNames, classIds }
        }));
    },
    
    // Add a single class using the proper Vue component flow
    async addSingleClass(className) {
        if (!this.vueComponentRef) return false;
        
        try {
            // Get current element classes (these are IDs)
            const currentClassIds = this.vueComponentRef.elementClasses || [];
            let availableClasses = this.vueComponentRef.availableClasses || [];
            
            console.log('Current class IDs on element:', currentClassIds);
            console.log('Available classes before:', availableClasses.map(c => ({ id: c.id, name: c.name })));
            
            // Check if class already exists in available classes
            let existingClass = availableClasses.find(c => c.name === className);
            
            if (!existingClass) {
                // Create new class first using createClassIfNeeded
                existingClass = this.vueComponentRef.createClassIfNeeded(className);
                console.log('Plain Classes API: Created new class:', className, 'with ID:', existingClass.id);
                
                // Wait a bit and refresh available classes after creation
                await new Promise(resolve => setTimeout(resolve, 100));
                availableClasses = this.vueComponentRef.availableClasses || [];
                console.log('Available classes after creation:', availableClasses.map(c => ({ id: c.id, name: c.name })));
                
                // Re-find the class in case the reference changed
                existingClass = availableClasses.find(c => c.name === className) || existingClass;
            }
            
            // Check if the class is already on the element
            if (!currentClassIds.includes(existingClass.id)) {
                const newClassIds = [...currentClassIds, existingClass.id];
                console.log('Adding class ID to element:', existingClass.id, 'New class list:', newClassIds);
                this.vueComponentRef.updateClasses(newClassIds);
                console.log('Plain Classes API: Added class to element:', className);
            } else {
                console.log('Plain Classes API: Class already on element:', className);
            }
            
            return true;
            
        } catch (error) {
            console.error('Plain Classes API: Error adding single class:', error);
            return false;
        }
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


// Debounce wrapper for updatePlainClasses
let updatePlainClassesTimeout;
function debounceUpdatePlainClasses(delay = 100) {
    if (updatePlainClassesTimeout) clearTimeout(updatePlainClassesTimeout);
    updatePlainClassesTimeout = setTimeout(() => {
        updatePlainClasses();
    }, delay);
}

(function(){
    const origDispatch = EventTarget.prototype.dispatchEvent;
    EventTarget.prototype.dispatchEvent = function(event) {
        console.log("Event dispatched:", event.type, event);
        return origDispatch.apply(this, arguments);
    };
})();

// Core functions
function getVueApp() {
    // Method 1: Check for Vue Devtools global reference
    if (window.__VUE_DEVTOOLS_GLOBAL_HOOK__?.apps?.size > 0) {
        const apps = Array.from(window.__VUE_DEVTOOLS_GLOBAL_HOOK__.apps);
        if (apps.length > 0) {
            return apps[0];
        }
    }
    
    // Method 2: Check for Oxygen-specific global references
    if (window.oxygenApp) {
        return window.oxygenApp;
    }
    
    // Method 3: Check for Vue app in common Oxygen selectors
    const oxygenSelectors = [
        '#app',
        '[data-test-id="oxygen-app"]',
        '.oxygen-app',
        '.breakdance-app'
    ];
    
    for (const selector of oxygenSelectors) {
        const element = document.querySelector(selector) || 
                       window.parent?.document.querySelector(selector);
        if (element?.__vue__) {
            return element.__vue__;
        }
    }
    
    // Method 4: Fallback to original method
    const app = document.querySelector('#app')?.__vue__ || 
                window.parent?.document.querySelector('#app')?.__vue__;
    
    if (app?.$store && !window.storeLogged) {
        window.storeLogged = true;
        console.log('Vuex Store found:', app.$store);
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
            console.log('Got classes from Vue component:', currentElementClasses);
            return currentElementClasses.join(' ');
        }
    }
    
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
    
    // Fallback to Vuex store
    if (currentElementClasses.length === 0) {
        const app = getVueApp();
        const elementId = app?.$store?.state?.ui?.activeElementId;
        if (elementId && app?.$store?.state?.document?.document?.tree) {
            const element = findElementInTree(app.$store.state.document.document.tree, elementId);
            if (element?.data?.properties?.settings?.advanced?.classes) {
                currentElementClasses = element.data.properties.settings.advanced.classes;
            }
        }
    }
    
    console.log('Current classes:', currentElementClasses);
    return currentElementClasses.length > 0 ? currentElementClasses.join(' ') : 'No classes found';
}

function findElementInTree(node, targetId) {
    if (!node) return null;
    if (node.id == targetId) return node;
    if (node.children) {
        for (const child of node.children) {
            const found = findElementInTree(child, targetId);
            if (found) return found;
        }
    }
    return null;
}

function findOxygenUpdateFunctions() {
    // Search for St.E4 in multiple scopes
    const scopes = [window, window.parent, window.top];
    
    for (const scope of scopes) {
        try {
            if (scope.St?.E4) {
                window.oxygenSetElementClasses = scope.St.E4;
                console.log('Found St.E4 function');
            }
            
            // Also look for setElementSelectors function
            if (scope.setElementSelectors) {
                window.setElementSelectors = scope.setElementSelectors;
                console.log('Found setElementSelectors function');
            }
        } catch (e) {
            // Skip inaccessible scopes
        }
    }
    
    // Search Vue components for updateClasses method using Devtools-compatible approach
    const app = getVueApp();
    if (app) {
        // Try faster Devtools methods first
        let updateClassesComponent = null;
        
        // Method 1: Check $root.$children
        if (app.$root?.$children) {
            for (const child of app.$root.$children) {
                if (child.updateClasses && typeof child.updateClasses === 'function') {
                    updateClassesComponent = child;
                    console.log('Found updateClasses method via $root.$children');
                    break;
                }
            }
        }
        
        // Method 2: Check app.$refs
        if (!updateClassesComponent && app.$refs) {
            for (const [key, ref] of Object.entries(app.$refs)) {
                if (ref && typeof ref === 'object' && ref.updateClasses && typeof ref.updateClasses === 'function') {
                    updateClassesComponent = ref;
                    console.log('Found updateClasses method via $refs:', key);
                    break;
                }
            }
        }
        
        // Method 3: Check if app itself has the method
        if (!updateClassesComponent && app.updateClasses && typeof app.updateClasses === 'function') {
            updateClassesComponent = app;
            console.log('Found updateClasses method on root app');
        }
        
        // Method 4: Fallback to recursive search
        if (!updateClassesComponent) {
            updateClassesComponent = findComponentByNameOrProps(app, (c) => 
                c.updateClasses && typeof c.updateClasses === 'function'
            );
            if (updateClassesComponent) {
                console.log('Found updateClasses method via recursive search');
            }
        }
        
        if (updateClassesComponent) {
            window.oxygenUpdateClasses = updateClassesComponent.updateClasses.bind(updateClassesComponent);
            console.log('Found updateClasses method');
        }
    }
    
    // Retry if functions not found
    if (!window.oxygenUpdateClasses && !window.oxygenSetElementClasses) {
        setTimeout(findOxygenUpdateFunctions, 2000);
    }
}

function updateOxygenClasses(classes) {
    const app = getVueApp();
    const elementId = app?.$store?.state?.ui?.activeElementId;
    
    if (!elementId) {
        console.log('No active element found');
        return false;
    }
    
    console.log('Updating classes:', classes);
    
    // Emit custom event before updating
    window.dispatchEvent(new CustomEvent('plain-classes-before-update', {
        detail: { classes, elementId, source: 'plain-plugin' }
    }));
    
    // Try Vue component method first with safe approach
    if (window.oxygenUpdateClasses && window.PlainClassesAPI?.vueComponentRef) {
        try {
            // Convert class names to IDs first
            const availableClasses = window.PlainClassesAPI.vueComponentRef.availableClasses || [];
            const classIds = classes.map(className => {
                const cls = availableClasses.find(c => c.name === className);
                return cls ? cls.id : null;
            }).filter(id => id !== null);
            
            // Use the safe approach from syncToVue
            const setElementSelectors = window.setElementSelectors || 
                                       window.PlainClassesAPI.vueComponentRef.setElementSelectors ||
                                       (window.parent && window.parent.setElementSelectors);
            
            if (setElementSelectors) {
                console.log('Using setElementSelectors directly in updateOxygenClasses');
                setElementSelectors(elementId, classIds);
            } else {
                // Fallback: temporarily disable closeMenu to avoid the error
                const originalCloseMenu = window.PlainClassesAPI.vueComponentRef.closeMenu;
                window.PlainClassesAPI.vueComponentRef.closeMenu = () => {
                    console.log('closeMenu call intercepted and ignored in updateOxygenClasses');
                };
                
                try {
                    window.oxygenUpdateClasses(classIds);
                } finally {
                    // Restore original closeMenu
                    window.PlainClassesAPI.vueComponentRef.closeMenu = originalCloseMenu;
                }
            }
            
            currentElementClasses = classes;
            
            // Emit success event
            window.dispatchEvent(new CustomEvent('plain-classes-updated', {
                detail: { classes, elementId, success: true, source: 'plain-plugin' }
            }));
            
            debounceUpdatePlainClasses(100);
            return true;
        } catch (error) {
            console.error('Error calling updateClasses:', error);
            
            // Emit error event
            window.dispatchEvent(new CustomEvent('plain-classes-error', {
                detail: { error: error.message, elementId, source: 'plain-plugin' }
            }));
        }
    }
    
    // Try St.E4 directly
    if (window.oxygenSetElementClasses) {
        try {
            window.oxygenSetElementClasses(elementId, classes);
            currentElementClasses = classes;
            
            // Emit success event
            window.dispatchEvent(new CustomEvent('plain-classes-updated', {
                detail: { classes, elementId, success: true, source: 'plain-plugin' }
            }));
            
            debounceUpdatePlainClasses(100);
            return true;
        } catch (error) {
            console.error('Error calling St.E4:', error);
            
            // Emit error event
            window.dispatchEvent(new CustomEvent('plain-classes-error', {
                detail: { error: error.message, elementId, source: 'plain-plugin' }
            }));
        }
    }
    
    console.log('No Oxygen update functions available');
    return false;
}

async function addClassesToElement(newClasses) {
    const newClassArray = newClasses.split(' ').filter(cls => cls.trim());
    
    // Get current classes from Vue component if available
    let existingClasses = currentElementClasses;
    if (window.PlainClassesAPI && window.PlainClassesAPI.vueComponentRef) {
        existingClasses = window.PlainClassesAPI.getClassesFromVue();
    }
    
    const allClasses = [...new Set([...existingClasses, ...newClassArray])];
    console.log('Adding classes - existing:', existingClasses, 'new:', newClassArray, 'merged:', allClasses);
    
    // Use Vue API if available for safer operation
    if (window.PlainClassesAPI && window.PlainClassesAPI.syncToVue) {
        try {
            const success = await window.PlainClassesAPI.syncToVue(allClasses);
                    if (success) {
            return true;
        }
        } catch (error) {
            console.error('Plain Classes: Error adding classes via Vue API:', error);
        }
    }
    
    // Fallback to direct update
    return updateOxygenClasses(allClasses);
}

async function removeClassFromElement(classToRemove) {
    // Get current classes from Vue component if available
    let existingClasses = currentElementClasses;
    if (window.PlainClassesAPI && window.PlainClassesAPI.vueComponentRef) {
        existingClasses = window.PlainClassesAPI.getClassesFromVue();
    }
    
    const filteredClasses = existingClasses.filter(cls => cls !== classToRemove);
    console.log('Removing class:', classToRemove, 'from:', existingClasses, 'result:', filteredClasses);
    
    // Use API if available
    if (window.PlainClassesAPI && window.PlainClassesAPI.syncToVue) {
        try {
            const success = await window.PlainClassesAPI.syncToVue(filteredClasses);
                    if (success) {
            return true;
        }
        } catch (error) {
            console.error('Plain Classes: Error removing class via API:', error);
        }
    }
    
    // Fallback to direct update
    return updateOxygenClasses(filteredClasses);
}

function createClassTagsHtml() {
    return currentElementClasses.length > 0 
        ? currentElementClasses.map(className => 
            `<span class="plain-class-tag" data-class="${className}" style="display: inline-block; background: #e1f5fe; color: #01579b; padding: 4px 8px; margin: 2px; border-radius: 12px; font-size: 12px; cursor: pointer; border: 1px solid #b3e5fc;">
                ${className} <span style="margin-left: 4px; font-weight: bold;">×</span>
            </span>`
          ).join('')
        : '<span style="color: #666; font-style: italic;">No classes found</span>';
}

function addClassTagClickHandlers(component) {
    const classTags = component.querySelectorAll('.plain-class-tag');
    classTags.forEach(tag => {
        const className = tag.getAttribute('data-class');
        
        tag.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (className && confirm(`Remove class "${className}"?`)) {
                try {
                    await removeClassFromElement(className);
                } catch (error) {
                    console.error('Error removing class:', error);
                }
            }
        });
        
        // Hover effects
        tag.addEventListener('mouseenter', () => {
            tag.style.background = '#ffcdd2';
            tag.style.color = '#c62828';
            tag.style.borderColor = '#e57373';
        });
        
        tag.addEventListener('mouseleave', () => {
            tag.style.background = '#e1f5fe';
            tag.style.color = '#01579b';
            tag.style.borderColor = '#b3e5fc';
        });
    });
}

function cleanupPlainClassesComponent() {
    const existingComponents = document.querySelectorAll('#plain-classes-component');
    existingComponents.forEach(component => component.remove());
    window.plainClassesComponentInitialized = false;
}

function updatePlainClasses() {
    const panel = findPanel();
    if (!panel) {
        return;
    }

    // Ensure we’re operating in the correct document context (in case of iframe)
    const containerDoc = panel.ownerDocument || document;

    const app = getVueApp();
    const currentElementId = app?.$store?.state?.ui?.activeElementId || 'None';

    getCurrentClassesFromOxygen();

    // Remove any existing component
    const existingComponents = containerDoc.querySelectorAll('#plain-classes-component');

    if (existingComponents.length > 0) {
        existingComponents.forEach((component, index) => {
            component.remove();
        });

        const leftovers = containerDoc.querySelectorAll('#plain-classes-component');
        if (leftovers.length > 0) {
            console.warn('Plain Classes: WARNING - Some components still remain after deletion!');
        }
    }

    // Create new component

    const component = containerDoc.createElement('div');
    component.id = 'plain-classes-component';
    component.innerHTML = `
        <div style="padding: 15px; border-bottom: 1px solid #ddd; background: #f9f9f9;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="margin: 0; color: #333;">Plain Classes</h3>
                <div id="sync-status" style="padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: bold;">
                    ${window.PlainClassesAPI && window.PlainClassesAPI.vueComponentRef
                        ? '<span style="color: #4caf50;">🟢 SYNCED</span>'
                        : '<span style="color: #ff9800;">🟡 BASIC</span>'}
                </div>
            </div>
            <div id="plain-classes-content">
                <p style="margin: 5px 0;"><strong>ID:</strong> ${currentElementId}</p>
                <div style="margin: 10px 0;">
                    <strong>Current Classes:</strong>
                    <div id="plain-classes-tags" style="margin-top: 8px; min-height: 30px; padding: 8px; background: white; border: 1px solid #ddd; border-radius: 4px;">
                        ${createClassTagsHtml()}
                    </div>
                </div>
                <div style="margin-top: 15px;">
                    <input type="text" id="plain-classes-input" placeholder="Enter new class names..." 
                           style="width: 100%; padding: 8px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 4px;">
                    <button id="plain-classes-update" 
                            style="width: 100%; padding: 10px; background: #007cba; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Add Classes to Element
                    </button>
                </div>
            </div>
        </div>
    `;

    // Insert before the panel
    panel.parentNode.insertBefore(component, panel);

    // Add event listeners
    const button = component.querySelector('#plain-classes-update');
    const input = component.querySelector('#plain-classes-input');

    button.addEventListener('click', async () => {
        const newClasses = input.value.trim();
        if (newClasses) {
            const newClassArray = newClasses.split(' ').filter(cls => cls.trim());
            if (window.PlainClassesAPI && window.PlainClassesAPI.vueComponentRef) {

                const currentClassNames = window.PlainClassesAPI.getClassesFromVue();
                const allClassNames = [...new Set([...currentClassNames, ...newClassArray])];

                try {
                    const success = await window.PlainClassesAPI.syncToVue(allClassNames);
                    if (success) {
                        // Successfully synced
                    } else {
                        console.error('Plain Classes: Failed to sync via API');
                    }
                } catch (error) {
                    console.error('Plain Classes: Error during syncToVue:', error);
                }
            } else {
                try {
                    await addClassesToElement(newClasses);
                } catch (error) {
                    console.error('Plain Classes: Error in fallback add:', error);
                }
            }

            input.value = '';
        }
    });

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') button.click();
    });

    addClassTagClickHandlers(component);
}

function init() {
    if (window.plainClassesInitialized) return;
    window.plainClassesInitialized = true;
    
    // Install Vue plugin if Vue is available
    const vueApp = getVueApp();
    if (vueApp && vueApp.$options && vueApp.$options.components) {
        try {
            // Install the plugin on the Vue app
            vueApp.$options.components.PlainClassesPanel = PlainClassesPlugin;
        } catch (error) {
            console.error('Plain Classes: Error installing Vue plugin:', error);
        }
    }
    
    // Set up mutation observer to detect when component is removed
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                // Check for removed nodes
                mutation.removedNodes.forEach((node) => {
                                    if (node.id === 'plain-classes-component' || 
                    (node.querySelector && node.querySelector('#plain-classes-component'))) {
                    // Component removed from DOM
                }
                });
            }
        });
    });
    
    // Start observing
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    findOxygenUpdateFunctions();
    debounceUpdatePlainClasses(0);
    
    // Try Vue-native integration first, fallback to DOM-based approach
    setTimeout(() => {
        if (injectPlainClassesIntoOxygen()) {
            // Vue-native integration successful
        } else {
            // Fallback to original DOM-based approach
            if (window.PlainClassesAPI.hookIntoVueComponent()) {
                // Successfully hooked into Vue component
            } else {
                // Retry after a delay
                setTimeout(() => window.PlainClassesAPI.hookIntoVueComponent(), 2000);
            }
        }
    }, 1000);
    
    // Listen for Vue element changes
    window.addEventListener('vue-element-changed', (event) => {
        // Re-hook into Vue component for the new element
        setTimeout(() => {
            if (window.PlainClassesAPI.hookIntoVueComponent()) {
                // Successfully re-hooked into Vue component for new element
            } else {
                // Could not find Vue component for new element
            }
        }, 100);
        
        debounceUpdatePlainClasses(50);
    });
    
    // Listen for sync events from Vue
    window.addEventListener('plain-classes-synced-from-vue', (event) => {
        // Update UI to reflect changes
        debounceUpdatePlainClasses(0);
    });
    
    // Set up watchers
    const app = getVueApp();
    if (app?.$store) {
        // Watch element selection changes
        app.$store.watch(
            (state) => state.ui?.activeElementId,
            (newId, oldId) => {
                if (newId !== oldId) {
                    // Re-hook into Vue component for the new element
                    setTimeout(() => {
                        if (window.PlainClassesAPI.hookIntoVueComponent()) {
                            // Successfully re-hooked into Vue component for element
                        } else {
                            // Could not find Vue component for element
                        }
                        
                        // Update the UI after re-hooking
                        debounceUpdatePlainClasses(0);
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
                        findOxygenUpdateFunctions();
                        debounceUpdatePlainClasses(0);
                        // Re-hook into Vue component if needed
                        if (!window.PlainClassesAPI.vueComponentRef) {
                            window.PlainClassesAPI.hookIntoVueComponent();
                        }
                    }, 100);
                }
            }
        );
    }
}

// Initialize
init();
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
}


