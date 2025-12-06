import * as React from "react"
import { cn } from "@utils/index"

export interface InputWithPrefixProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  prefix: React.ReactNode
}

const InputWithPrefix = React.forwardRef<HTMLInputElement, InputWithPrefixProps>(
  ({ className, prefix, type = "text", ...props }, ref) => {
    return (
      <div className="flex w-full items-center rounded-md border border-input bg-base-1 overflow-hidden">
        <div className="flex items-center whitespace-nowrap bg-[#ddd] dark:bg-base-3 px-3 py-2 text-sm">
          {prefix}
        </div>
        <input
          type={type}
          className={cn(
            "flex h-10 w-full bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          ref={ref}
          {...props}
        />
      </div>
    )
  }
)
InputWithPrefix.displayName = "InputWithPrefix"

export { InputWithPrefix }
