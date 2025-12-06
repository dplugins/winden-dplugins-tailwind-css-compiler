import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import App from './App';
import WizzardProvider from './hooks/wizzardContext';
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

root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WizzardProvider>
          <App licenseStatus={licenseStatus} proExists={proExists} />
        </WizzardProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </React.StrictMode>
);