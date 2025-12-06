import * as React from "react";
import { cn } from "@utils/index";
import { Label } from "@el/Label"; // Adjust the path as necessary

/**
 * Input component with optional label support and customizable styling.
 *
 * @example
 * ```tsx
 * <Input label="Email" type="email" placeholder="Enter your email" />
 * <Input type="text" value={value} onChange={handleChange} />
 * <Input overrideClasses className="custom-input" />
 * ```
 */
export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Optional label text to display above the input */
  label?: string;
  /** Override default classes with custom className */
  overrideClasses?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, overrideClasses = false, ...props }, ref) => {
    const defaultClasses = `
      shadow-none
      flex w-full h-10 px-3 py-2 rounded-md
      bg-base-1 text-foreground text-sm
      border border-input
      outline-none focus:outline focus:outline-solid focus:outline-ring focus:outline-offset-2
      relative focus:z-10
    `;

    const inputClasses = overrideClasses 
      ? className 
      : cn(defaultClasses, className);

    return (
      <div className="relative flex w-full flex-col gap-2 !grow">
        {label && (
          <Label
            htmlFor={props.id}
            className="absolute -top-6 text-xs uppercase text-foreground/50"
          >
            {label}
          </Label>
        )}
        <input
          type={type}
          className={inputClasses}
          ref={ref}
          {...props}
        />
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
