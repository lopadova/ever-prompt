import { Component, type ErrorInfo, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { queryClient } from '@/lib/query-client';
import { Layout } from '@/routes/layout';
import { DashboardPage } from '@/routes/dashboard';
import { PromptsPage } from '@/routes/prompts';
import { PromptDetailPage } from '@/routes/prompt-detail';
import { PromptNewPage } from '@/routes/prompt-new';
import { SettingsPage } from '@/routes/settings';
import { ApiKeysPage } from '@/routes/api-keys';
import { SessionsPage } from '@/routes/sessions';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error?: Error }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-zinc-950 text-zinc-100">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold">Something went wrong</h1>
            <p className="text-zinc-400">{this.state.error?.message}</p>
            <button
              className="px-4 py-2 bg-indigo-500 rounded-md hover:bg-indigo-600"
              onClick={() => { this.setState({ hasError: false }); window.location.href = '/'; }}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function App() {
  return (
    <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300}>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="prompts" element={<PromptsPage />} />
              <Route path="prompts/new" element={<PromptNewPage />} />
              <Route path="prompts/:id" element={<PromptDetailPage />} />
              <Route path="sessions" element={<SessionsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="settings/api-keys" element={<ApiKeysPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#18181b',
              border: '1px solid #27272a',
              color: '#fafafa',
            },
          }}
        />
      </TooltipProvider>
    </QueryClientProvider>
    </ErrorBoundary>
  );
}
