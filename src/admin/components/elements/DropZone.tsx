import * as React from "react"
import { cn } from "@utils/index"

interface DropZoneProps extends React.HTMLAttributes<HTMLDivElement> {
  onFilesDrop: (files: File[]) => void
}

const DropZone = React.forwardRef<HTMLDivElement, DropZoneProps>(
  ({ className, onFilesDrop, ...props }, ref) => {
    const [isDragging, setIsDragging] = React.useState(false)
    const dragCounter = React.useRef(0)

    React.useEffect(() => {
      const handleDragEnter = (e: DragEvent) => {
        e.preventDefault()
        dragCounter.current++
        if (e.dataTransfer?.types.includes('Files')) {
          setIsDragging(true)
        }
      }

      const handleDragLeave = (e: DragEvent) => {
        e.preventDefault()
        dragCounter.current--
        if (dragCounter.current === 0) {
          setIsDragging(false)
        }
      }

      const handleDragOver = (e: DragEvent) => {
        e.preventDefault()
      }

      const handleDrop = (e: DragEvent) => {
        e.preventDefault()
        dragCounter.current = 0
        setIsDragging(false)
      }

      window.addEventListener('dragenter', handleDragEnter)
      window.addEventListener('dragleave', handleDragLeave)
      window.addEventListener('dragover', handleDragOver)
      window.addEventListener('drop', handleDrop)

      return () => {
        window.removeEventListener('dragenter', handleDragEnter)
        window.removeEventListener('dragleave', handleDragLeave)
        window.removeEventListener('dragover', handleDragOver)
        window.removeEventListener('drop', handleDrop)
      }
    }, [])

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      dragCounter.current = 0

      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) {
        onFilesDrop(files)
      }
    }

    if (!isDragging) {
      return null
    }

    return (
      <div
        ref={ref}
        onDrop={handleDrop}
        className={cn(
          "absolute inset-0 flex items-center justify-center border-2 border-dashed rounded-lg transition-colors z-50",
          "border-action bg-action/10",
          className
        )}
        {...props}
      />
    )
  }
)
DropZone.displayName = "DropZone"

export { DropZone }
