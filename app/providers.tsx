'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'react-hot-toast';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1e40af',
              color: '#fff',
              borderRadius: '10px',
              padding: '12px 16px',
              fontSize: '14px',
            },
            success: {
              style: { background: '#16a34a' },
              iconTheme: { primary: '#fff', secondary: '#16a34a' },
            },
            error: {
              style: { background: '#dc2626' },
              iconTheme: { primary: '#fff', secondary: '#dc2626' },
            },
          }}
        />
      </ThemeProvider>
    </SessionProvider>
  );
}
