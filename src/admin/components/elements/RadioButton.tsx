import React from "react";
import classNames from "classnames";

/**
 * Custom radio button component with optional label.
 *
 * @example
 * ```tsx
 * <RadioButton
 *   name="theme"
 *   checked={selectedTheme === 'dark'}
 *   onChange={() => setSelectedTheme('dark')}
 *   label="Dark Mode"
 * />
 * ```
 */
interface RadioButtonProps {
  /** Radio button group name */
  name: string;
  /** Whether the radio button is checked */
  checked: boolean;
  /** Change handler */
  onChange: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Optional label text */
  label?: string;
}

const RadioButton: React.FC<RadioButtonProps> = ({
  name,
  checked,
  onChange,
  className = "",
  label = "",
}) => {
  return (
    <div className="flex items-center">
      <button
        type="button"
        role="radio"
        aria-checked={checked}
        data-state={checked ? "checked" : "unchecked"}
        value={label}
        className={classNames(
          "flex h-6 w-6 items-center justify-center rounded-full border transition-colors relative",
          checked
            ? 'border-foreground bg-base-1 after:absolute after:h-2 after:w-2 after:rounded-full after:bg-base-foreground after:content-[""]'
            : "border-input bg-base-1",
          className
        )}
        onClick={onChange}
        tabIndex={0}
      />
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        style={{ display: "none" }}
      />
      {label && <span className="ml-2 text-sm">{label}</span>}
    </div>
  );
};

export default RadioButton;
