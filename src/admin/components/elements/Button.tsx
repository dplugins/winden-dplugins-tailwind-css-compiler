import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@utils/index";
import { ReactComponent as DeleteOutlineIcon } from "@/assets/icons/DeleteOutlineIcon.svg";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap outline-none rounded text-sm font-medium ring-offset-base transition-colors disabled:pointer-events-none disabled:opacity-50 cursor-pointer!",
  {
    variants: {
      variant: {
        default: "bg-base-foreground text-base-1 hover:bg-base-foreground/90 dark:bg-[var(--input-bg)] dark:hover:bg-base-3 dark:text-base-foreground",
        warning: "bg-yellow-200 hover:bg-yellow-200/80 border-yellow-300",
        danger: "bg-danger text-danger-foreground hover:bg-danger/90",
        destructive:
          "border border-input text-danger bg-base-1 hover:bg-danger hover:text-danger-foreground hover:border-danger p-2",
        success: "bg-green-200 hover:bg-green-200/80 border-green-300",
        outline: "border border-input bg-base-1 hover:bg-base-2 hover:text-base-foreground",
        ghost: "hover:bg-base-2 hover:text-base-foreground",
        link: "text-base-foreground underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-3 py-2",
        sm: "h-8 px-3",
        lg: "h-11 px-8",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

/**
 * Button component with multiple variants and sizes.
 *
 * @example
 * ```tsx
 * <Button variant="default" size="lg">Click me</Button>
 * <Button variant="danger" onClick={handleDelete}>Delete</Button>
 * <Button variant="outline" icon={<Icon />}>With Icon</Button>
 * ```
 */
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Render as a child component using Radix Slot */
  asChild?: boolean;
  /** Optional icon to display before the button text */
  icon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, icon, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    // If only icon is provided, use icon size
    const finalSize = icon && !children ? "icon" : size;

    return (
      <Comp
        className={cn(buttonVariants({ variant, size: finalSize, className }))}
        ref={ref}
        {...props}
      >
        {variant === "destructive" ? (
          <DeleteOutlineIcon />
        ) : (
          <>
            {icon && <span className="inline-flex items-center">{icon}</span>}
            {children}
          </>
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
