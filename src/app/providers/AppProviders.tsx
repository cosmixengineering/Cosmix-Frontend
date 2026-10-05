import type { PropsWithChildren } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { queryClient } from '@/services/query/query-client';
import { AuthProvider } from '@/auth/AuthProvider';
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>{children}</BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
