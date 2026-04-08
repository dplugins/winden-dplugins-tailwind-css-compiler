/**
 * Tailwind Color Selector
 *
 * Allows selective inclusion of Tailwind default color palettes
 * when extendColors is disabled
 */

import React, { useMemo } from 'react';
import { Checkbox } from '@el/Checkbox';
import { tailwindColorNames, formatColorName } from '@/constants/tailwindColors';
import { SidebarSeparator } from '../components/layout/Layout';

interface TailwindColorSelectorProps {
  selectedColors: string[];
  onSelectionChange: (colors: string[]) => void;
  extendColors: boolean;
  includeUtilityColors: boolean;
  onUtilityColorsChange: (checked: boolean) => void;
}

const TailwindColorSelector: React.FC<TailwindColorSelectorProps> = ({
  selectedColors,
  onSelectionChange,
  extendColors,
  includeUtilityColors,
  onUtilityColorsChange,
}) => {
  // Count how many colors are selected
  const selectedCount = selectedColors.length;

  // Toggle a single color
  const toggleColor = (colorName: string) => {
    const newSelection = selectedColors.includes(colorName)
      ? selectedColors.filter((c) => c !== colorName)
      : [...selectedColors, colorName];

    onSelectionChange(newSelection);
  };

  // Select all colors and utility colors
  const selectAll = () => {
    onSelectionChange([...tailwindColorNames]);
    onUtilityColorsChange(true);
  };

  // Deselect all colors and utility colors
  const deselectAll = () => {
    onSelectionChange([]);
    onUtilityColorsChange(false);
  };

  // Disabled when extendColors is enabled (all colors already included)
  const isDisabled = extendColors;

  // Group colors into columns for better layout
  // Add utility colors as first item in first column
  const columns = useMemo(() => {
    const allItems = ['__utility_colors__', ...tailwindColorNames];
    const columnSize = Math.ceil(allItems.length / 3);
    return [
      allItems.slice(0, columnSize),
      allItems.slice(columnSize, columnSize * 2),
      allItems.slice(columnSize * 2),
    ];
  }, []);

  return (
    <div className="space-y-3">
      {/* Title */}
      <SidebarSeparator
        label={`Tailwind Colors${selectedCount > 0 && !isDisabled ? ` (${selectedCount})` : ''}`}
      />

      {/* Hint when Extend is enabled */}
      {isDisabled && (
        <p className="text-xs text-muted-foreground">
          Disable "Extend" below to selectively include colors
        </p>
      )}

      {/* Color Grid - Always Visible */}
      {!isDisabled && (
        <div className="space-y-3">
          {/* Quick Actions */}
          <div className="flex gap-2 text-xs">
            <button
              onClick={selectAll}
              className="text-action hover:underline"
            >
              Select All
            </button>
            <span className="text-muted-foreground">•</span>
            <button
              onClick={deselectAll}
              className="text-action hover:underline"
            >
              Deselect All
            </button>
          </div>

          {/* Color Checkboxes in 3 Columns (with Utility Colors integrated) */}
          <div className="grid grid-cols-3 gap-x-4 gap-y-1.5 text-xs">
            {columns.map((column, colIndex) => (
              <div key={colIndex} className="space-y-1.5">
                {column.map((item) => {
                  // Special case for utility colors checkbox
                  if (item === '__utility_colors__') {
                    return (
                      <Checkbox
                        key="utility-colors"
                        label="Utility Colors"
                        checked={includeUtilityColors}
                        onCheckedChange={onUtilityColorsChange}
                      />
                    );
                  }

                  // Regular color checkbox
                  return (
                    <Checkbox
                      key={item}
                      label={formatColorName(item)}
                      checked={selectedColors.includes(item)}
                      onCheckedChange={() => toggleColor(item)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TailwindColorSelector;
