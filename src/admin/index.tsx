import React, { useContext } from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import App from './App';
import WizzardProvider, { WizzardContext } from './hooks/wizzardContext';
import { EditorProvider } from './contexts/EditorContext';
import { TooltipProvider } from '@el/Tooltip';

/**
 * React Query client configuration
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const rootElement = document.getElementById('App');
if (!rootElement) {
  throw new Error('Root element "App" not found');
}

const root = ReactDOM.createRoot(rootElement);
const licenseStatus = rootElement.getAttribute('data-license') ?? 'false';
const proExists = rootElement.getAttribute('data-pro-exists') ?? 'true';

/**
 * AppWithEditor wraps App with EditorProvider
 * This component needs to be inside WizzardProvider to access localWizzardState
 */
function AppWithEditor() {
  const { localWizzardState } = useContext(WizzardContext)!;

  return (
    <EditorProvider
      licenseStatus={licenseStatus}
      proExists={proExists}
      localWizzardState={localWizzardState}
    >
      <App />
    </EditorProvider>
  );
}

root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WizzardProvider>
          <AppWithEditor />
        </WizzardProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </React.StrictMode>
);