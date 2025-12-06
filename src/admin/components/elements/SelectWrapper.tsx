import * as React from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./Select"
import { Label } from "./Label"
import { cn } from "@utils/index"

interface SelectOption {
  label: string
  value: string
}

interface SelectWrapperProps {
  label?: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  className?: string
  disabled?: boolean
}

const SelectWrapper = React.forwardRef<HTMLDivElement, SelectWrapperProps>(
  ({ label, value, options, onChange, className, disabled }, ref) => {
    return (
      <div ref={ref} className={cn("space-y-2", className)}>
        {label && (
          <Label className="text-sm font-medium">{label}</Label>
        )}
        <Select value={value} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }
)
SelectWrapper.displayName = "SelectWrapper"

export { SelectWrapper }
