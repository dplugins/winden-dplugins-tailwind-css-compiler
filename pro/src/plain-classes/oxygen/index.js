import { createRoot } from 'react-dom/client';
import WindenAutocompleteWithScreens from '../../../../src/plain-classes/winauto-component/WindenAutocompleteWithScreens';
import './index.scss';

function dispatchActiveElementClassesChange(newClasses) {
  newClasses = Array.from(new Set(newClasses));
  const event = new CustomEvent('activeElementClassesChange', { detail: { newClasses } });
  window.dispatchEvent(event);
}

document.addEventListener('click', function (e) {
  var ctControllerUI = document.querySelector('#ct-controller-ui');

  if (ctControllerUI && !ctControllerUI.classList.contains('event-listener-added')) {
    ctControllerUI.classList.add('event-listener-added');

    ctControllerUI.addEventListener('click', function (e) {
      setTimeout(async function () {
        const inputElem = ctControllerUI.querySelector('.plain-classes-box');

        $scope.iframeScope.validateClassName = function (name) {
          // Updated regex to allow :, -, /, [, ], !, &, *, <, and > at the beginning of class names
          // Allows the class name to start with ! (optional), /, :, a-z, _, -, &, *, <, > (case insensitive)
          // Followed by any combination of /, :, a-z, 0-9, _, -, [, ], &, *, <, > (case insensitive)
          let re = /^!?[\/:%a-z\d_\-*&<>]*(?:\:!)?[\/:a-z\d_\-\[\]\(\)#,%.&*<>]*$/i;
          return re.test(name);
        };

        if (inputElem && !inputElem.classList.contains('autocomplete-initialized')) {
          inputElem.classList.add('autocomplete-initialized');

          // Parse options from window.plain_classes.winden_classes and remove duplicates
          let options = [];
          if (window.winden_autocomplete && typeof window.winden_autocomplete === 'object') {
            // Convert object to array using Object.values()
            options = Object.values(window.winden_autocomplete);
            options = [...new Set(options)]; // Remove duplicates, if any
          } else {
            console.error('winden_autocomplete is not an object:', window.winden_autocomplete);
          }

          let screenOptions = [];
          if (window.winden_autocomplete_screens && typeof window.winden_autocomplete_screens === 'object') {
            // Convert object to array using Object.values()
            screenOptions = Object.values(window.winden_autocomplete_screens);
            screenOptions = [...new Set(screenOptions)]; // Remove duplicates, if any
          } else {
            console.error('winden_autocomplete_screens is not an object:', window.winden_autocomplete_screens);
          }

          const _tags = await getActiveElementClasses();
          const autoCompleteProps = {
            onChange: async (tags) => {
              await replaceTagsInOxygenBuilder(tags);
            },
            defaultTags: _tags ?? [],
          }

          const rootNode = document.createElement('div');
          rootNode.id = 'plain-classes-autocomplete-root';
          rootNode.style.width = '100%';
          inputElem.appendChild(rootNode);

          const root = createRoot(rootNode);
          root.render(<WindenAutocompleteWithScreens {...autoCompleteProps} />);
        } else if (inputElem && inputElem.classList.contains('autocomplete-initialized')) {
          const classes = await getActiveElementClasses();
          if (classes) {
            dispatchActiveElementClassesChange(classes);
          }
        }
      }, 50);
    });
  }
}, { once: true });

// Attach Event Listener for delete
const _oxygenSidebarWait = setInterval(() => {
  if (document.getElementById('oxygen-sidebar')) {
    clearInterval(_oxygenSidebarWait);
    document.getElementById('oxygen-sidebar').addEventListener('click', function (event) {
      if (event.target.matches('.oxygen-no-margin[title="Remove class from component"]')) {
        setTimeout(async () => {
          const classes = await getActiveElementClasses();
          if (classes) {
            dispatchActiveElementClassesChange(classes);
          }
        }, 200);
      }
    });
  }
}, 100);

async function getActiveElementClasses() {
  // Use $scope directly like Oxygen does
  if ($scope?.iframeScope?.component?.active?.id) {
    const activeId = $scope.iframeScope.component.active.id;

    // Get classes directly from componentsClasses like Oxygen does
    // Reference: oxygen/component-framework/angular/controllers/controller.classes.js lines 107-114
    if ($scope.iframeScope.componentsClasses[activeId]) {
      return $scope.iframeScope.componentsClasses[activeId];
    }

    // If no classes found in componentsClasses, check the component tree
    if ($scope.iframeScope.componentsTree?.children) {
      const activeComponent = await getObjectById(
        $scope.iframeScope.componentsTree.children,
        activeId
      );

      if (activeComponent?.options?.classes) {
        return activeComponent.options.classes;
      }
    }

    // Fallback to DOM query only if needed
    const activeElement = document.querySelector('.ct-active');
    if (activeElement) {
      const classElements = document.querySelectorAll(".oxygen-active-selector-box-classname");
      return Array.from(classElements, el => el.textContent.trim());
    }
  }

  return [];
}

function getObjectById(array, targetId, callback) {
  return new Promise((resolve, reject) => {
    const search = (arr) => {
      for (let obj of arr) {
        if (obj.id === targetId) {
          if (callback) {
            callback(obj);
          }
          resolve(obj);
          return;
        }
        if (obj.children && Array.isArray(obj.children)) {
          search(obj.children);
        }
      }
    };

    search(array);

    reject(new Error(`Object with id ${targetId} not found`));
  });
}

function areArraysEqual(arr1, arr2) {
  if (arr1.length !== arr2.length) return false;
  return JSON.stringify([...arr1].sort()) === JSON.stringify([...arr2].sort());
}

async function replaceTagsInOxygenBuilder(tags) {
  if (
    !areArraysEqual(tags, (await getActiveElementClasses())) &&
    $scope &&
    $scope?.iframeScope?.componentsTree?.children &&
    $scope?.iframeScope?.component?.active?.id &&
    !!$scope?.iframeScope?.getActiveComponent
  ) {
    const activeComponentId = $scope.iframeScope.component.active.id;

    if (activeComponentId) {
      const oldClasses = $scope.iframeScope.componentsClasses[activeComponentId];
      if (oldClasses?.length) {
        oldClasses.map(tag => {
          $scope.iframeScope.removeComponentClass(tag, activeComponentId);
        });
      }

      tags.map(tag => {
        $scope.iframeScope.addClassToComponent(activeComponentId, tag);
      });
    }
  }
}