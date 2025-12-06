import * as React from 'react'
import { Spinner } from './Spinner';

/**
 * Loading screen component with centered spinner
 * Used throughout the app for async operations
 */
const LoadingScreen: React.FC = () => {
    return (
        <div className="flex items-center content-center justify-center h-[80vh] w-full">
            <div className="flex items-center gap-1"><Spinner />Loading...</div>
        </div>
    )
}

export default LoadingScreen
