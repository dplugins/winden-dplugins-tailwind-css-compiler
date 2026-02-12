import { useState, useEffect } from "react";
import { Autocomplete as WindenAutocomplete } from '../winauto-component/index.js';
import { arraysEqual } from '../../shared/utils.js';

const WindenAutocompleteWithScreens = ({
  defaultTags,
  onChange,
  isDark = true,
  blockId = null,
  onPreviewClassChange,
}) => {
  const [isScreenChecked, setIsScreenChecked] = useState(false);
  const [__tags, set__Tags] = useState(defaultTags);
  const [dragData, setDragData] = useState(null);
  const [dragOverScreen, setDragOverScreen] = useState(null);
  const [autocompleteData, setAutocompleteData] = useState([]);
  const [screenData, setScreenData] = useState([]);

  // Poll for window.winden_autocomplete since it's set asynchronously by the iframe
  useEffect(() => {
    const checkForAutocompleteData = () => {
      // Check main window and parent (iframe sets parent)
      const autocomplete = window.winden_autocomplete || window.parent?.winden_autocomplete;
      const screens = window.winden_autocomplete_screens || window.parent?.winden_autocomplete_screens;

      if (autocomplete && typeof autocomplete === 'object') {
        const vals = Object.values(autocomplete);
        const uniqueVals = [...new Set(vals)];
        if (uniqueVals.length > 0 && uniqueVals.length !== autocompleteData.length) {
          setAutocompleteData(uniqueVals);
        }
      }

      if (screens && typeof screens === 'object') {
        const vals = Object.values(screens);
        const uniqueVals = [...new Set(vals)];
        if (uniqueVals.length > 0 && uniqueVals.length !== screenData.length) {
          setScreenData(uniqueVals);
        }
      }
    };

    // Check immediately
    checkForAutocompleteData();

    // Poll every 500ms until we have data (iframe might take time to load)
    const interval = setInterval(() => {
      checkForAutocompleteData();
    }, 500);

    // Stop polling after 30 seconds
    const timeout = setTimeout(() => {
      clearInterval(interval);
    }, 30000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [autocompleteData.length, screenData.length]);

  // Use state-based options instead of useMemo
  const options = autocompleteData;
  const screenOptions = screenData;

  const hasScreenKey = (str) => {
    const matchedKey = screenOptions.find(key => str.startsWith(`${key}:`));
    return matchedKey || null;
  }

  const getBreakpointTags = () => {
    const initialStates = screenOptions.reduce((acc, key) => {
      acc[key] = [];
      return acc;
    }, { default: [] });

    __tags.forEach((tag) => {
      screenOptions.forEach((key) => {
        if (tag.startsWith(`${key}:`)) {
          initialStates[key].push(tag);
        }
      });
      if (!tag.includes(":")) {
        initialStates.default.push(tag);
      } else if (tag.includes(":") && !hasScreenKey(tag)) {
        initialStates.default.push(tag);
      }
    });

    return initialStates;
  };

  const getDefaultTagsByKey = (key = 'default') => {
    return getBreakpointTags()[key];
  };

  // Drag and drop handlers
  const handleDragStart = (e, tag, index, sourceScreen) => {
    if (!isScreenChecked || screenOptions.length === 0) return;
    
    // Extract the class name without the prefix
    const classWithoutPrefix = sourceScreen === 'default' ? tag : tag.replace(`${sourceScreen}:`, '');
    
    console.log('Drag Start:', { tag, sourceScreen, classWithoutPrefix });
    
    setDragData({
      tag: classWithoutPrefix,
      index: index,
      sourceScreen: sourceScreen,
      originalTag: sourceScreen === 'default' ? tag : `${sourceScreen}:${tag}`
    });
    
    e.dataTransfer.effectAllowed = 'copyMove';
    e.dataTransfer.setData('text/plain', classWithoutPrefix);
  };

  const handleDragOver = (e, targetScreen) => {
    if (!isScreenChecked || screenOptions.length === 0) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverScreen(targetScreen);
  };

  const handleDrop = (e, targetTag, targetIndex, targetScreen) => {
    if (!isScreenChecked || screenOptions.length === 0 || !dragData) return;
    
    e.preventDefault();
    
    const { tag, sourceScreen, originalTag } = dragData;
    
    console.log('Drop:', { tag, sourceScreen, targetScreen, originalTag });
    
    // Don't drop on the same screen
    if (sourceScreen === targetScreen) {
      setDragData(null);
      setDragOverScreen(null);
      return;
    }

    // Remove from source screen
    const currentTags = [...__tags];
    const sourceIndex = currentTags.findIndex(t => t === originalTag);
    if (sourceIndex !== -1) {
      currentTags.splice(sourceIndex, 1);
    }

    // Add to target screen with proper prefix
    const newTag = targetScreen === 'default' ? tag : `${targetScreen}:${tag}`;
    currentTags.push(newTag);

    console.log('New tag created:', newTag);
    console.log('Updated tags:', currentTags);

    set__Tags(currentTags);
    onChange(currentTags);
    setDragData(null);
    setDragOverScreen(null);
  };

  const handleDragEnd = () => {
    setDragData(null);
    setDragOverScreen(null);
  };

  useEffect(() => {
    const handleActiveElementClassesChange = (event) => {
      // Only respond to events for this specific block (if blockId is provided)
      if (blockId && event.detail.blockId && event.detail.blockId !== blockId) {
        return;
      }
      if (Array.isArray(event.detail.newClasses)) {
        set__Tags((prevTags) => (
          arraysEqual(prevTags, event.detail.newClasses)
            ? prevTags
            : event.detail.newClasses
        ));
      }
    };
    window.addEventListener('activeElementClassesChange', handleActiveElementClassesChange);

    return () => {
      window.removeEventListener('activeElementClassesChange', handleActiveElementClassesChange);
    };
  }, [blockId]);

  return (
    <div id="winauto">

      {/* <div id="winauto-screens">
        {screenOptions.map((screen, idx) => (
          <button
            key={idx}
            onClick={() => {
              const newTag = `${screen}:`;
              const updatedTags = [...__tags, newTag];
              set__Tags(updatedTags);
              onChange(updatedTags);

              // Enable editing for the newly added tag
              const newTagIndex = updatedTags.length - 1;
              const autocompleteKey = isScreenChecked ? screen + ":" : "";
              const tagToEdit = autocompleteKey + newTag.replace(`${screen}:`, "");
              setTimeout(() => {
                const event = new CustomEvent("editTag", {
                  detail: { tag: tagToEdit, index: newTagIndex }
                });
                window.dispatchEvent(event);
              }, 0);
            }}
          >
            {screen}
          </button>
        ))}
      </div> */}

      {
        isScreenChecked ? (
          <>
            <p className="winauto-textarea--title">Default</p>
            <WindenAutocomplete
              key={JSON.stringify(getDefaultTagsByKey('default'))}
              onChange={(tags) => {
                const _tags = Object.values({
                  ...getBreakpointTags(),
                  default: [...tags],
                }).flat();

                onChange(_tags);
                set__Tags(_tags);
              }}
              onPreviewChange={(tags) => {
                const _tags = Object.values({
                  ...getBreakpointTags(),
                  default: [...tags],
                }).flat();

                // Dispatch a custom event for preview changes (scoped to this block)
                const event = new CustomEvent("activeElementClassesChange", {
                  detail: { newClasses: _tags, blockId }
                });
                window.dispatchEvent(event);
              }}
              defaultTags={getDefaultTagsByKey('default')}
              autocomplete={options}
              autocompleteKey={""}
              isScreenChecked={isScreenChecked}
              screens={screenOptions}
              isDark={isDark}
              onDragStart={handleDragStart}
              onDragOver={(e) => handleDragOver(e, 'default')}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              dragOverScreen={dragOverScreen}
              dragData={dragData}
              blockId={blockId}
              onPreviewClassChange={onPreviewClassChange}
            />
            {screenOptions.map((key, idx) => (
              <div key={idx} style={{ marginTop: '10px' }}>
                <p className="winauto-textarea--title">{key}</p>
                <WindenAutocomplete
                  key={JSON.stringify(getDefaultTagsByKey(key))}
                  onChange={(tags) => {
                    const _tags = Object.values({
                      ...getBreakpointTags(),
                      [key]: [...tags],
                    }).flat();

                    onChange(_tags);
                    set__Tags(_tags);
                  }}
                  onPreviewChange={(tags) => {
                    const _tags = Object.values({
                      ...getBreakpointTags(),
                      [key]: [...tags],
                    }).flat();

                    // Dispatch a custom event for preview changes (scoped to this block)
                    const event = new CustomEvent("activeElementClassesChange", {
                      detail: { newClasses: _tags, blockId }
                    });
                    window.dispatchEvent(event);
                  }}
                  defaultTags={getDefaultTagsByKey(key)}
                  autocomplete={options}
                  autocompleteKey={key + ":"}
                  isScreenChecked={isScreenChecked}
                  screens={screenOptions}
                  isDark={isDark}
                  onDragStart={handleDragStart}
                  onDragOver={(e) => handleDragOver(e, key)}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                  dragOverScreen={dragOverScreen}
                  dragData={dragData}
                  blockId={blockId}
                  onPreviewClassChange={onPreviewClassChange}
                />
              </div>
            ))}
          </>
        ) : (
          <WindenAutocomplete
            key={JSON.stringify(__tags)}
            onChange={(tags) => {
              const _tags = [...tags];
              onChange(_tags);
              set__Tags(_tags);
            }}
            onPreviewChange={(tags) => {
              const _tags = [...tags];
              // Dispatch a custom event for preview changes (scoped to this block)
              const event = new CustomEvent("activeElementClassesChange", {
                detail: { newClasses: _tags, blockId }
              });
              window.dispatchEvent(event);
            }}
            defaultTags={__tags}
            autocomplete={options}
            autocompleteKey={""}
            isScreenChecked={isScreenChecked}
            screens={screenOptions}
            isDark={isDark}
            blockId={blockId}
            onPreviewClassChange={onPreviewClassChange}
          />
        )
      }
      <label id="windauto--screens" className="windauto--toggle--label" style={{ marginTop: '12px' }}>
        <span className={`winauto--toggle ${isScreenChecked ? 'is-checked' : ''}`}>
          <input type="checkbox" checked={isScreenChecked} onChange={() => setIsScreenChecked(!isScreenChecked)} />
          <span className="winauto--toggle_dot"></span>
        </span>
        Split Screens (by breakpoint)
      </label>
    </div >
  );
}

export default WindenAutocompleteWithScreens;
