import React from 'react'
import classNames from 'classnames'
import { ReactComponent as ChevronRightIcon } from '@/assets/icons/ChevronRightIcon.svg'
import { Button } from '@el/Button'

/**
 * Button with an arrow icon that appears on hover.
 *
 * @example
 * ```tsx
 * <ArrowButton onClick={handleNext}>
 *   Next Step
 * </ArrowButton>
 * ```
 */
interface ArrowButtonProps {
    /** Click handler function */
    onClick?: () => void
    /** Additional CSS classes */
    className?: string
    /** Button content */
    children: React.ReactNode
}

const ArrowButton: React.FC<ArrowButtonProps> = ({ onClick, className, children }) => {
    return (
        <Button
            onClick={onClick}
            variant="outline"
            className={classNames(
                'group flex h-10 items-center justify-between',
                className
            )}
        >
            {children}
            <div className="hidden group-hover:block">
                <ChevronRightIcon />
            </div>
        </Button>
    )
}

export { ArrowButton }
