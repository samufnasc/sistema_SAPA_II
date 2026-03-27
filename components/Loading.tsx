'use client';

import { Loader2 } from 'lucide-react';

interface LoadingProps {
  text?: string;
  fullPage?: boolean;
}

export function Loading({ text = 'Carregando...', fullPage = false }: LoadingProps) {
  if (fullPage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        <p className="text-sm text-gray-500">{text}</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-12 gap-3">
      <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
      <p className="text-sm text-gray-500">{text}</p>
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 bg-primary-800 rounded-xl flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        </div>
        <p className="text-sm text-gray-500">Carregando...</p>
      </div>
    </div>
  );
}
