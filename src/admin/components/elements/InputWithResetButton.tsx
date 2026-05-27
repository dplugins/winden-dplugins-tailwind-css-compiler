import React from "react";
import classNames from "classnames";
import { ReactComponent as CancelIcon } from "@/assets/icons/DeleteIcon.svg";

/**
 * Input field with an optional reset button that appears when enabled.
 *
 * @example
 * ```tsx
 * <InputWithResetButton
 *   label="Color Value"
 *   value={colorValue}
 *   onChange={handleChange}
 *   onReset={handleReset}
 *   showReset={isModified}
 *   type="text"
 * />
 * ```
 */
interface InputWithResetButtonProps {
  /** Optional label text */
  label?: string;
  /** Current input value */
  value: string | number;
  /** Change handler */
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Reset button click handler */
  onReset: () => void;
  /** Blur event handler */
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  /** Focus event handler */
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  /** Whether to show the reset button */
  showReset?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Input type */
  type?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Title attribute */
  title?: string;
  /** Accessible label */
  ariaLabel?: string;
}

const InputWithResetButton: React.FC<InputWithResetButtonProps> = ({
  label,
  value,
  onChange,
  onReset,
  onBlur,
  onFocus,
  showReset = false,
  className = "",
  type = "text",
  disabled = false,
  placeholder = "",
  title = "",
  ariaLabel = "",
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    if (type === "number" && inputValue) {
      if (!isNaN(Number(inputValue)) || inputValue === "." || inputValue === "-") {
        onChange(e);
      }
    } else {
      onChange(e);
    }
  };

  return (
    <div className={classNames("input-with-reset", className)}>
      {label && <label>{label}</label>}
      <div className="relative flex items-center">
        <input
          type={type}
          value={value || ""}
          onChange={handleInputChange}
          onBlur={onBlur}
          onFocus={onFocus}
          disabled={disabled}
          placeholder={placeholder}
          title={title}
          aria-label={ariaLabel}
          className="flex w-full h-10 px-3 py-2 rounded-md text-sm border focus:outline-ring focus:outline-offset-2 text-black focus:text-indigo-600 focus:ring-indigo-200 border-input bg-base-1 pr-8"
        />
        {showReset && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onReset}
            className="text-black hover:text-red-600 absolute right-2 top-1/2 transform -translate-y-1/2 z-50!"
            disabled={disabled}
            title="Reset to original color"
          >
            <CancelIcon />
          </button>
        )}
      </div>
    </div>
  );
};

export default InputWithResetButton;
