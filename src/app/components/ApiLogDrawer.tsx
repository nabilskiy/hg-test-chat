import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ApiLogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const ApiLogDrawer: React.FC<ApiLogDrawerProps> = ({ isOpen, onClose }) => {
  const { apiLogs, clearApiLogs } = useApp();
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const getStatusColor = (status: number) => {
    if (status === 0) return 'bg-gray-500';
    if (status >= 200 && status < 300) return 'bg-green-500';
    if (status >= 300 && status < 400) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const toggleExpand = (logId: string) => {
    setExpandedLogId(expandedLogId === logId ? null : logId);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="absolute bottom-0 left-0 right-0 bg-white border-t shadow-2xl max-h-[60vh] flex flex-col z-20"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-gray-50">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">API Logs</h3>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                {apiLogs.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearApiLogs}
                className="p-2 hover:bg-gray-200 rounded transition-colors"
                title="Clear logs"
              >
                <Trash2 className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-200 rounded transition-colors"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Log List */}
          <div className="flex-1 overflow-y-auto">
            {apiLogs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p className="text-sm">No API calls yet</p>
              </div>
            ) : (
              <div className="divide-y">
                {apiLogs.map((log) => (
                  <div key={log.id} className="hover:bg-gray-50">
                    <button
                      onClick={() => toggleExpand(log.id)}
                      className="w-full text-left p-3 flex items-start gap-3"
                    >
                      <div className="shrink-0 mt-1">
                        {expandedLogId === log.id ? (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono font-semibold text-gray-700">
                            {log.method}
                          </span>
                          <span
                            className={`text-xs font-mono px-1.5 py-0.5 rounded text-white ${getStatusColor(
                              log.status
                            )}`}
                          >
                            {log.status || 'ERR'}
                          </span>
                          <span className="text-xs text-gray-500">{log.responseTime}ms</span>
                        </div>
                        <div className="text-xs text-gray-600 truncate font-mono">
                          {log.url}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {log.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </button>

                    {/* Expanded Details */}
                    {expandedLogId === log.id && (
                      <div className="px-3 pb-3 pl-10 space-y-2">
                        {log.requestBody && (
                          <div>
                            <div className="text-xs font-semibold text-gray-700 mb-1">
                              Request Body:
                            </div>
                            <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                              {JSON.stringify(log.requestBody, null, 2)}
                            </pre>
                          </div>
                        )}
                        <div>
                          <div className="text-xs font-semibold text-gray-700 mb-1">
                            Response:
                          </div>
                          <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto max-h-48 overflow-y-auto">
                            {typeof log.responseBody === 'string'
                              ? log.responseBody
                              : JSON.stringify(log.responseBody, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ApiLogDrawer;
