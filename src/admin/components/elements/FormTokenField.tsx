import * as React from "react"
import { X } from "@/components/icons"
import { cn } from "@utils/index"
import { Label } from "./Label"

interface FormTokenFieldProps {
  label?: string
  value: string[]
  onChange: (tokens: string[]) => void
  suggestions?: string[]
  placeholder?: string
  className?: string
}

const FormTokenField = React.forwardRef<HTMLDivElement, FormTokenFieldProps>(
  ({ label, value = [], onChange, suggestions = [], placeholder = "Add new...", className }, ref) => {
    const [inputValue, setInputValue] = React.useState("")
    const [showSuggestions, setShowSuggestions] = React.useState(false)
    const inputRef = React.useRef<HTMLInputElement>(null)

    const filteredSuggestions = suggestions.filter(
      (suggestion) =>
        !value.includes(suggestion) &&
        suggestion.toLowerCase().includes(inputValue.toLowerCase())
    )

    const addToken = (token: string) => {
      if (token && !value.includes(token)) {
        onChange([...value, token])
        setInputValue("")
      }
    }

    const removeToken = (tokenToRemove: string) => {
      onChange(value.filter((token) => token !== tokenToRemove))
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && inputValue.trim()) {
        e.preventDefault()
        addToken(inputValue.trim())
      } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
        removeToken(value[value.length - 1])
      }
    }

    return (
      <div ref={ref} className={cn("space-y-2", className)}>
        {label && (
          <Label className="text-sm font-medium">{label}</Label>
        )}
        <div className="relative">
          <div
            className="flex flex-wrap gap-2 min-h-[40px] w-full rounded-md border border-input bg-base-2 px-1 py-1 text-sm cursor-text"
            onClick={() => inputRef.current?.focus()}
          >
            {value.map((token, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-2 py-1 bg-action text-action-foreground rounded text-xs"
              >
                {token}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeToken(token)
                  }}
                  className="hover:bg-action/80 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value)
                setShowSuggestions(true)
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder={value.length === 0 ? placeholder : ""}
              className="flex-1 min-w-[120px] outline-none bg-transparent"
            />
          </div>
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 rounded-md border bg-base-1 shadow-md bg-base-1">
              {filteredSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    addToken(suggestion)
                    inputRef.current?.focus()
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-base-3 first:rounded-t-md last:rounded-b-md"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }
)
FormTokenField.displayName = "FormTokenField"

export { FormTokenField }
