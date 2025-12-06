import * as React from "react"
import { Switch } from "./Switch"
import { Label } from "./Label"
import { cn } from "@utils/index"

interface SwitchWithLabelProps {
  label: string
  name?: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
}

const SwitchWithLabel = React.forwardRef<HTMLDivElement, SwitchWithLabelProps>(
  ({ label, name, checked, onChange, disabled, className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
           "flex items-center justify-between py-3 border-b border-border last:border-0",
          className
        )}
      >
        <Label
          htmlFor={name}
          className="text-sm font-normal cursor-pointer flex-1"
        >
          {label}
        </Label>
        <Switch
          id={name}
          checked={checked}
          onCheckedChange={onChange}
          disabled={disabled}
        />
      </div>
    )
  }
)
SwitchWithLabel.displayName = "SwitchWithLabel"

export { SwitchWithLabel }
