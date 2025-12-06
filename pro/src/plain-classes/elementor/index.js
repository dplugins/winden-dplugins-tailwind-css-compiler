import { createRoot } from 'react-dom/client';
import WindenAutocompleteWithScreens from "../../../../src/plain-classes/winauto-component/WindenAutocompleteWithScreens";
import './index.scss';

let _tags = [];
let _initialized = false;

function dispatchActiveElementClassesChange(newClasses) {
  const event = new CustomEvent('activeElementClassesChange', { detail: { newClasses } });
  window.dispatchEvent(event);
}

// Main initialization function
function initWindenElementor() {
  const previewIframe = document.getElementById('elementor-preview-iframe');
  if (previewIframe) {
    const iframeWindow = previewIframe.contentWindow;
    if (iframeWindow?.tailwind) {
      window.parent.tailwind = iframeWindow.tailwind;
    }
  }

  const arraysEqual = (arr1, arr2) => {
    if (arr1?.length !== arr2?.length) {
      return false;
    }

    const sortedArr1 = [...arr1].sort();
    const sortedArr2 = [...arr2].sort();

    return sortedArr2.every((value, index) => value === sortedArr1[index]);
  };

  // Use MutationObserver to watch for when #elementor-controls gets populated
  const observer = new MutationObserver((mutations) => {
    const controlsContainer = document.querySelector('#elementor-controls');
    const alreadyInjected = document.querySelector('#winden-plain-classes-wrapper');

    // Only inject if controls exist, have content, and we haven't injected yet
    if (controlsContainer && controlsContainer.children.length > 0 && !alreadyInjected) {
      injectPlainClasses();
    }
  });

  // Wait a bit for the panel to render, then start observing
  setTimeout(() => {
    const panelInner = document.querySelector('#elementor-panel-inner');
    if (panelInner) {
      observer.observe(panelInner, {
        childList: true,
        subtree: true
      });

      // Also check immediately in case controls are already populated
      const controlsContainer = document.querySelector('#elementor-controls');
      const alreadyInjected = document.querySelector('#winden-plain-classes-wrapper');

      if (controlsContainer && controlsContainer.children.length > 0 && !alreadyInjected) {
        injectPlainClasses();
      }
    }
  }, 1000);

  // Function to inject Plain Classes component
  function injectPlainClasses() {
    const controlsContainer = document.querySelector('#elementor-controls');
    if (!controlsContainer) {
      return;
    }

    // Get current widget from Elementor
    const currentWidget = elementor?.getCurrentElement?.();
    if (!currentWidget) {
      return;
    }

    const getActiveElementClasses = () => {
      // Access the model to get settings
      const model = currentWidget?.model;

      // Try _css_classes first (regular widgets)
      let classes = model?.getSetting?.('_css_classes');

      // If not found, try custom_css_classes (containers)
      if (!classes) {
        classes = model?.getSetting?.('custom_css_classes');
      }

      return classes?.length ? classes.split(' ').filter(c => c.trim()) : [];
    }

    const setActiveElementClasses = (classNames) => {
      const model = currentWidget?.model;

      // Try _css_classes first (regular widgets)
      if (model?.getSetting?.('_css_classes') !== undefined) {
        model.setSetting('_css_classes', classNames.join(' '));
      }
      // Otherwise try custom_css_classes (containers)
      else {
        model.setSetting('custom_css_classes', classNames.join(' '));
      }

      currentWidget.renderOnChange?.();
      elementor.saver.setFlagEditorChange(true);
    }

    // Create wrapper with proper styling
    const wrapper = document.createElement('div');
    wrapper.id = 'winden-plain-classes-wrapper';
    wrapper.style.padding = '15px';
    wrapper.style.borderBottom = '1px solid #e6e9ec';
    wrapper.style.backgroundColor = '#fff';
    wrapper.innerHTML = `
      <div style="margin-bottom: 10px; font-weight: 500; color: #495157;">Plain Classes</div>
      <div id="plain-classes-autocomplete-root"></div>
    `;

    // Insert at the beginning of controls
    controlsContainer.insertBefore(wrapper, controlsContainer.firstChild);

    const autoCompleteProps = {
      onChange: (tags) => {
        _tags = [...tags];
        const classes = getActiveElementClasses();
        if (!arraysEqual(classes, _tags)) {
          setActiveElementClasses(_tags);
        }
      },
      defaultTags: getActiveElementClasses() ?? [],
    }

    const rootElement = document.querySelector('#plain-classes-autocomplete-root');

    if (rootElement) {
      const root = createRoot(rootElement);
      root.render(<WindenAutocompleteWithScreens {...autoCompleteProps} />);
      _initialized = true;
    }
  }
}

// Check if Elementor is already initialized
if (typeof elementor !== 'undefined') {
  initWindenElementor();
} else {
  window.addEventListener('elementor/init', initWindenElementor);
}