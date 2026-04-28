'use client';

import { useEffect, useRef } from 'react';

interface LogViewerProps {
  logs?: string;
  isLoading?: boolean;
}

export function LogViewer({ logs, isLoading }: LogViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden">
      <div className="px-4 py-2 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-300">Build Logs</span>
        {isLoading && (
          <span className="flex items-center gap-2 text-xs text-gray-400">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Live
          </span>
        )}
      </div>
      <div
        ref={containerRef}
        className="p-4 h-64 overflow-y-auto font-mono text-sm text-gray-300"
      >
        {logs ? (
          logs.split('\n').map((line, i) => (
            <div key={i} className="whitespace-pre-wrap">
              {line}
            </div>
          ))
        ) : (
          <div className="text-gray-500">Waiting for logs...</div>
        )}
      </div>
    </div>
  );
}
