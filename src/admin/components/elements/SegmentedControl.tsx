import React from "react";
import classNames from "classnames";

/**
 * Segmented Control component for toggle-style options
 *
 * @example
 * ```tsx
 * <SegmentedControl
 *   options={[
 *     { value: 'fluid', label: 'Fluid' },
 *     { value: 'fixed', label: 'Fixed' }
 *   ]}
 *   value="fluid"
 *   onChange={(value) => setValue(value)}
 * />
 * ```
 */
interface SegmentedControlOption {
  value: string;
  label: string;
}

interface SegmentedControlProps {
  /** Array of options to display */
  options: SegmentedControlOption[];
  /** Currently selected value */
  value: string;
  /** Change handler that receives the selected value */
  onChange: (value: string) => void;
  /** Additional CSS classes */
  className?: string;
}

const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  value,
  onChange,
  className = "",
}) => {
  return (
    <div
      className={classNames(
        "inline-flex w-full rounded-md border border-input bg-base-1 p-1",
        className
      )}
      role="group"
    >
      {options.map((option) => {
        const isSelected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={classNames(
              "flex-1 rounded px-4 py-2 text-sm font-medium transition-all duration-200",
              isSelected
                ? "bg-base-foreground text-base-1 shadow-sm dark:bg-[var(--input-bg)] dark:hover:bg-base-3 dark:text-base-foreground"
                : "bg-transparent text-foreground hover:bg-base-3 cursor-pointer"
            )}
            aria-pressed={isSelected}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};

export default SegmentedControl;
