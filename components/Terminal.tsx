'use client';

import { useEffect, useRef } from 'react';

export interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'info' | 'success' | 'error' | 'warning' | 'api' | 'operation';
  message: string;
  data?: any;
}

interface TerminalProps {
  logs: LogEntry[];
}

export default function Terminal({ logs }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new logs are added
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  };

  const formatData = (data: any): string => {
    if (data === null || data === undefined) return 'null';
    if (typeof data === 'string') return data;
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  const getTypeColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      case 'warning':
        return 'text-yellow-400';
      case 'api':
        return 'text-blue-400';
      case 'operation':
        return 'text-purple-400';
      default:
        return 'text-gray-300';
    }
  };

  const getTypePrefix = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✗';
      case 'warning':
        return '⚠';
      case 'api':
        return '→';
      case 'operation':
        return '⚙';
      default:
        return '•';
    }
  };

  return (
    <div className="mt-8 bg-gray-900 dark:bg-black rounded-lg shadow-xl overflow-hidden border border-gray-700">
      <div className="bg-gray-800 dark:bg-gray-900 px-4 py-2 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <span className="text-gray-300 text-sm font-mono">Terminal Log</span>
        </div>
        <span className="text-gray-500 text-xs font-mono">
          {logs.length} entries
        </span>
      </div>
      <div
        ref={terminalRef}
        className="h-64 overflow-y-auto p-4 font-mono text-xs"
        style={{
          fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, "source-code-pro", monospace',
        }}
      >
        {logs.length === 0 ? (
          <div className="text-gray-500 italic">No logs yet. Operations will appear here...</div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="mb-2">
              <div className="flex items-start gap-2">
                <span className="text-gray-500 flex-shrink-0">
                  [{formatTimestamp(log.timestamp)}]
                </span>
                <span className={`flex-shrink-0 ${getTypeColor(log.type)}`}>
                  {getTypePrefix(log.type)}
                </span>
                <span className={`flex-1 ${getTypeColor(log.type)}`}>
                  {log.message}
                </span>
              </div>
              {log.data !== undefined && (
                <div className="ml-12 mt-1 text-gray-400 whitespace-pre-wrap break-all">
                  <details className="cursor-pointer">
                    <summary className="text-gray-500 hover:text-gray-300">
                      View data ({typeof log.data === 'object' ? 'object' : typeof log.data})
                    </summary>
                    <pre className="mt-2 p-2 bg-gray-800 rounded text-xs overflow-x-auto">
                      {formatData(log.data)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

