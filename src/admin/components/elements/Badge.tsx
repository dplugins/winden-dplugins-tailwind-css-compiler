import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@utils/index";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-action text-action-foreground hover:bg-action/80",
        secondary:
          "border-transparent bg-base-2 text-base-2-foreground hover:bg-base-2/80",
        danger:
          "border-transparent bg-danger text-danger-foreground hover:bg-danger/80",
        success: "bg-green-200 hover:bg-green-200/80 border-green-300",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
