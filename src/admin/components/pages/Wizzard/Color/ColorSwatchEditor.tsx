import React, { useState, useEffect, useRef } from "react";
import { Colorful } from "@uiw/react-color";
import tinycolor from "tinycolor2";
import RgbSliders from "./SlidersRGB";
import HslSliders from "./SlidersHSL";
import OklchSliders from "./SlidersOKLCH";
import ColorSwatch from "./ColorSwatch";
import { colorModeChangeRGB, handleHslChange, parseColorInput } from "./colorModelsConvert";

interface RGB {
  r: number;
  g: number;
  b: number;
  a?: number;
}

interface HSL {
  h: number;
  s: number;
  l: number;
  a?: number;
}

interface HueSliderProps {
  color: RGB | string;
  onChange: (color: RGB) => void;
}

/**
 * Simple Hue Slider component for HEX format
 */
const HueSlider: React.FC<HueSliderProps> = ({ color, onChange }) => {
  const handleHueChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const newHue = parseInt(e.target.value);
    const currentColor = tinycolor(color);
    const hsl = currentColor.toHsl();
    const newColor = tinycolor({ h: newHue, s: hsl.s, l: hsl.l });
    onChange(newColor.toRgb());
  };

  const currentHue = tinycolor(color).toHsl().h;

  return (
    <div className="flex items-center gap-2 text-xs">
      <label className="min-w-[20px]">H:</label>
      <input
        type="range"
        min="0"
        max="360"
        value={currentHue}
        onChange={handleHueChange}
        className="flex-1 h-2 bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-cyan-500 via-blue-500 via-magenta-500 to-red-500 rounded-lg appearance-none cursor-pointer"
        style={{
          background: "linear-gradient(to right, red, yellow, green, cyan, blue, magenta, red)"
        }}
      />
      <input
        type="number"
        min="0"
        max="360"
        value={Math.round(currentHue)}
        onChange={handleHueChange}
        className="w-16 text-right bg-transparent border-none text-xs"
      />
    </div>
  );
};

interface ColorEntryType {
  id: number | string;
  name: string;
  hex?: string;
  shades?: any[];
}

interface ColorSwatchEditorProps {
  color: RGB | string;
  hsl: HSL;
  activeTab?: string;
  setHsl: (hsl: HSL) => void;
  setColor: (color: RGB) => void;
  updateColor: (color: RGB) => void;
  entry?: ColorEntryType;
  shadesList?: any[];
  updateColorEntry?: (id: number | string, updates: any) => void;
  title?: string;
  position?: string;
  onColorChange?: ((hex: string) => void) | null;
  colorFormat?: string;
}

/**
 * Reusable ColorSwatchEditor component for editing colors
 * @param color - Current color (RGB object or string)
 * @param hsl - Current HSL values
 * @param activeTab - Active tab in parent component
 * @param setHsl - Callback to set HSL values
 * @param setColor - Callback to set RGB color
 * @param updateColor - Callback to update color
 * @param entry - Color entry object
 * @param shadesList - List of shades
 * @param updateColorEntry - Callback to update color entry
 * @param title - Editor title
 * @param position - CSS position class for editor popup
 * @param onColorChange - Optional callback for shade editing
 * @param colorFormat - Color format (hex, rgb, hsl, oklch)
 */
const ColorSwatchEditor: React.FC<ColorSwatchEditorProps> = ({
  color,
  hsl,
  activeTab,
  setHsl,
  setColor,
  updateColor,
  entry,
  shadesList,
  updateColorEntry,
  title = "Edit Color",
  position = "right-0",
  onColorChange = null,
  colorFormat = "hex"
}) => {
  const [showColorEdit, setShowColorEdit] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  // Local state for shade editing
  const [localColor, setLocalColor] = useState<RGB>(tinycolor(color).toRgb());
  const [localHsl, setLocalHsl] = useState<HSL>(tinycolor(color).toHsl());

  // Update local state when color prop changes
  useEffect(() => {
    // Handle different color formats including OKLCH
    let parsedColor: tinycolor.Instance | null;
    if (typeof color === 'string') {
      // Use enhanced parser for string formats (OKLCH, HSL with deg, etc.)
      parsedColor = parseColorInput(color);
    } else {
      // Use tinycolor for RGB objects
      parsedColor = tinycolor(color);
    }

    if (parsedColor && parsedColor.isValid()) {
      setLocalColor(parsedColor.toRgb());
      setLocalHsl(parsedColor.toHsl());
    } else {
      // Fallback to black if parsing fails
      console.warn('Failed to parse color:', color);
      setLocalColor({ r: 0, g: 0, b: 0, a: 1 });
      setLocalHsl({ h: 0, s: 0, l: 0, a: 1 });
    }
  }, [color]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (editorRef.current && !editorRef.current.contains(event.target as Node)) {
        setShowColorEdit(false);
      }
    };

    if (showColorEdit) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColorEdit]);

  /**
   * Handle color change from Colorful picker
   */
  const handleColorChange = (colorResult: any): void => {
    console.log('Colorful onChange:', colorResult);
    const newColor = tinycolor(colorResult.hex || colorResult);

    if (onColorChange) {
      // For shade editing, use the custom callback
      onColorChange(newColor.toHexString());
      // Update local state for the editor
      setLocalColor(newColor.toRgb());
      setLocalHsl(newColor.toHsl());
    } else {
      // For main color editing, use the standard flow
      setColor(newColor.toRgb());
      setHsl(newColor.toHsl());
      updateColor(newColor.toRgb());
    }
  };

  /**
   * Handle local color change from sliders
   */
  const handleLocalColorChange = (newColor: RGB): void => {
    if (onColorChange) {
      // For shade editing
      onColorChange(tinycolor(newColor).toHexString());
      setLocalColor(tinycolor(newColor).toRgb());
      setLocalHsl(tinycolor(newColor).toHsl());
    } else {
      // For main color editing
      updateColor(newColor);
    }
  };

  /**
   * Handle local HSL change from sliders
   */
  const handleLocalHslChange = (newHsl: HSL): void => {
    if (onColorChange) {
      // For shade editing
      const newColor = tinycolor(newHsl);
      onColorChange(newColor.toHexString());
      setLocalColor(newColor.toRgb());
      setLocalHsl(newHsl);
    } else {
      // For main color editing
      setHsl(newHsl);
      updateColor(tinycolor(newHsl).toRgb());
    }
  };

  /**
   * Handle swatch color changes (swatches can return hex strings or HSV objects)
   */
  const handleSwatchChange = (colorData: any): void => {
    // The @uiw/react-color Swatch component returns HSV format, not hex
    // So we need to handle both hex strings and HSV/RGB objects
    let newColor: tinycolor.Instance;

    if (typeof colorData === 'string') {
      // If it's a string, parse it directly
      newColor = tinycolor(colorData);
    } else if (colorData.hex) {
      // If it has a hex property, use that
      newColor = tinycolor(colorData.hex);
    } else {
      // Otherwise, assume it's an HSV/RGB object and parse it
      newColor = tinycolor(colorData);
    }

    if (onColorChange) {
      // For shade editing
      onColorChange(newColor.toHexString());
      setLocalColor(newColor.toRgb());
      setLocalHsl(newColor.toHsl());
    } else {
      // For main color editing
      setColor(newColor.toRgb());
      setHsl(newColor.toHsl());
      updateColor(newColor.toRgb());
    }
  };

  // Use local state for shade editing, props for main color editing
  const displayColor = onColorChange ? localColor : color;
  const displayHsl = onColorChange ? localHsl : hsl;

  // Check if current color matches the main color (same logic as ShadesList)
  const isMatched = entry && entry.hex && onColorChange ?
    tinycolor(displayColor).toHexString().toLowerCase() ===
    tinycolor(entry.hex).toHexString().toLowerCase() : false;

  /**
   * Get proper background color - handle all formats including OKLCH
   */
  const getBackgroundColor = (): string => {
    // If displayColor is a string (like OKLCH), parse it first
    if (typeof displayColor === 'string') {
      const parsedColor = parseColorInput(displayColor);
      return parsedColor ? parsedColor.toHexString() : '#000000';
    }
    // If displayColor is an RGB object, use tinycolor
    return tinycolor(displayColor).toHexString();
  };

  /**
   * Render sliders based on color format
   */
  const renderSliders = () => {
    switch (colorFormat.toLowerCase()) {
      case 'hex':
        return (
          <HueSlider color={displayColor} onChange={handleLocalColorChange} />
        );
      case 'rgb':
        return (
          <RgbSliders
            color={displayColor as RGB}
            onChange={handleLocalColorChange}
          />
        );
      case 'hsl':
        return (
          <HslSliders
            hsl={displayHsl}
            onChange={handleLocalHslChange}
          />
        );
      case 'oklch':
        return (
          <OklchSliders
            color={displayColor as RGB}
            onChange={handleLocalColorChange}
          />
        );
      default:
        // Fallback to HSL for unknown formats
        return (
          <HslSliders
            hsl={displayHsl}
            onChange={handleLocalHslChange}
          />
        );
    }
  };

  return (
    <div className="relative" ref={editorRef}>
      <div
        className="h-10 w-12 min-w-12 rounded-md cursor-pointer hover:scale-105 transition-transform"
        style={{
          backgroundColor: getBackgroundColor(),
          ...(isMatched && {
            outline: "2px solid #9e9e9e",
            outlineOffset: "2px",
          }),
        }}
        onClick={() => setShowColorEdit(!showColorEdit)}
        title={`Click to edit ${title.toLowerCase()}`}
      />
      {showColorEdit && (
        <div className={`absolute top-[100%] ${position} z-50 bg-base-1 border border-input rounded-md shadow-lg p-4 min-w-[300px]`}>
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">{title}</div>
              <button
                onClick={() => setShowColorEdit(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Close editor"
              >
                ✕
              </button>
            </div>
            <Colorful
              color={tinycolor(displayColor).toHexString()}
              disableAlpha={true}
              onChange={handleColorChange}
              className="!w-full [&_.w-color-alpha]:hidden [&_.w-color-interactive]:!rounded-md"
            />

            {/* Show hue slider for HEX format between color picker and swatches */}
            {colorFormat.toLowerCase() === 'hex' && renderSliders()}

            <ColorSwatch color={displayColor} onChange={handleSwatchChange} />

            {/* Show other sliders for non-HEX formats */}
            {colorFormat.toLowerCase() !== 'hex' && renderSliders()}
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorSwatchEditor;
