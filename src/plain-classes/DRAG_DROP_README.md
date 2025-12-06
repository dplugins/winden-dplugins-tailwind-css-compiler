# Drag & Drop Functionality for Winden Plain Classes

## Overview

The Winden plain classes component now supports drag and drop functionality between different screen breakpoints when the "Split Screens" toggle is enabled. This allows users to easily move Tailwind CSS classes between different responsive breakpoints.

## Features

### ✅ Drag and Drop Between Screens
- Drag classes from one screen breakpoint to another
- Automatic prefix management (e.g., moving `bg-blue-500` from Default to `md:` becomes `md:bg-blue-500`)
- Prevents dropping on the same screen to avoid duplicates

### ✅ Visual Feedback
- **Dragging State**: Tags become semi-transparent and slightly scaled down
- **Drop Target**: Target screens show dashed borders and subtle background color
- **Smooth Transitions**: All animations use CSS transitions for smooth user experience

### ✅ Smart Class Management
- Maintains proper class prefixes for each breakpoint
- Handles both prefixed and non-prefixed classes
- Preserves existing functionality while adding drag and drop

## How It Works

### 1. Component Structure
```
WindenAutocompleteWithScreens
├── Default Screen (no prefix)
├── sm: Screen
├── md: Screen
├── lg: Screen
├── xl: Screen
└── 2xl: Screen
```

### 2. Drag and Drop Flow
1. **Drag Start**: User clicks and drags a class tag
2. **Drag Over**: Visual feedback shows valid drop targets
3. **Drop**: Class is moved from source to target screen with appropriate prefix
4. **Update**: Component state is updated and onChange callback is triggered

### 3. Implementation Details

#### Tag Component (`Tag.jsx`)
- Added `draggable={true}` attribute
- New props: `onDragStart`, `onDragOver`, `onDrop`, `isDragging`, `canDrop`
- CSS classes for visual feedback: `.dragging`, `.can-drop`

#### Autocomplete Component (`Autocomplete.jsx`)
- Handles drag and drop events for individual autocomplete instances
- Manages drag state and visual feedback
- Passes drag props to Tag components

#### WindenAutocompleteWithScreens Component (`WindenAutocompleteWithScreens.js`)
- Orchestrates drag and drop between different screens
- Manages global drag state (`dragData`, `dragOverScreen`)
- Handles class prefix management during drops

## Usage

### For Users
1. Enable the "Split Screens" toggle
2. Add classes to different screen breakpoints
3. Click and drag any class tag to move it between screens
4. Visual feedback will guide you during the drag operation

### For Developers
The drag and drop functionality is automatically available in all plain-classes implementations:
- **Gutenberg**: Available in block inspector controls
- **Bricks**: Available in element settings panel
- **Elementor**: Available in widget settings
- **Oxygen**: Available in element properties

## CSS Classes Added

```scss
// Tag dragging state
.winauto-textarea--item.dragging {
  opacity: 0.5;
  transform: scale(0.95);
  cursor: grabbing;
}

// Drop target indication
.winauto-textarea--item.can-drop {
  border: 2px dashed var(--winauto-action);
  background-color: rgba(56, 118, 250, 0.1);
}

// Container drop target
.winauto-textarea.drag-target {
  outline: 2px dashed var(--winauto-action);
  background-color: rgba(56, 118, 250, 0.05);
}
```

## Browser Support

The drag and drop functionality uses the HTML5 Drag and Drop API, which is supported in:
- ✅ Chrome 4+
- ✅ Firefox 3.5+
- ✅ Safari 3.1+
- ✅ Edge 12+

## Testing

To test the functionality:
1. Open any plain-classes implementation (Gutenberg, Bricks, etc.)
2. Enable "Split Screens" toggle
3. Add classes to different screens
4. Try dragging classes between screens
5. Verify visual feedback and proper prefix management

## Future Enhancements

Potential improvements for future versions:
- Drag multiple classes at once
- Copy instead of move (Ctrl/Cmd + drag)
- Undo/redo for drag operations
- Keyboard shortcuts for moving classes
- Drag from suggestions list directly to screens 