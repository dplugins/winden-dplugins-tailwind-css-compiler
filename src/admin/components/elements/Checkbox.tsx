import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "@/components/icons";
import { cn } from "@utils/index";

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> & {
    label?: string;
  }
>(({ className, label, ...props }, ref) => (
  <label className="flex items-center cursor-pointer">
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        `flex p-2.5  items-center justify-center peer h-4 w-4 shrink-0 rounded-sm bg-base-1 cursor-pointer
                border border-base-foreground 
                ring-offset-base-foreground  
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-base-foreground focus-visible:ring-offset-2 
                disabled:cursor-not-allowed disabled:opacity-50 
                data-[state=checked]:bg-base-foreground  data-[state=checked]:text-base-1
                
                dark:data-[state=checked]:bg-[var(--input-bg)] dark:data-[state=checked]:text-base-foreground dark:border-input
                `,
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        className={cn("flex items-center justify-center text-current scale-75")}
      >
        <Check className="h-4 w-4 min-h-4 min-w-4" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
    {label && <span className="ml-2">{label}</span>}
  </label>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
