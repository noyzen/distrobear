import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { LogEntry } from '../types';
import { ArrowPathIcon, ClipboardDocumentIcon, TrashIcon, MagnifyingGlassIcon } from '../components/Icons';
import SpinnerIcon from '../components/shared/SpinnerIcon';

const MAX_FRONTEND_LOGS = 2000;

const LogLevelPill: React.FC<{ level: LogEntry['level'] }> = ({ level }) => {
    const levelStyles = {
        INFO: 'bg-blue-500/20 text-blue-300',
        WARN: 'bg-yellow-500/20 text-yellow-300',
        ERROR: 'bg-red-500/20 text-red-300',
    };
    return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${levelStyles[level]}`}>{level}</span>;
};

const Logs: React.FC = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [levelFilters, setLevelFilters] = useState<Set<LogEntry['level']>>(new Set(['INFO', 'WARN', 'ERROR']));
    const [statusMessage, setStatusMessage] = useState('');
    const logContainerRef = useRef<HTMLDivElement>(null);

    const fetchLogs = async () => {
        setIsLoading(true);
        const initialLogs = await window.electronAPI.getInitialLogs();
        setLogs(initialLogs);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchLogs();
        window.electronAPI.onLogEntry((log) => {
            setLogs(prev => [...prev, log].slice(-MAX_FRONTEND_LOGS));
        });
        // IPC listener in Electron doesn't typically return a cleanup function.
    }, []);

    useEffect(() => {
        // Auto-scroll on new log entry if scrolled to the bottom
        const el = logContainerRef.current;
        if (el) {
            // A little buffer room
            const isScrolledToBottom = el.scrollHeight - el.clientHeight <= el.scrollTop + 5;
            if (isScrolledToBottom) {
                el.scrollTop = el.scrollHeight;
            }
        }
    }, [logs]);

    const handleLevelFilterChange = (level: LogEntry['level']) => {
        const newFilters = new Set(levelFilters);
        if (newFilters.has(level)) {
            newFilters.delete(level);
        } else {
            newFilters.add(level);
        }
        setLevelFilters(newFilters);
    };

    const handleCopyLogs = () => {
        const formattedLogs = filteredLogs.map(log => 
            `[${new Date(log.timestamp).toISOString()}] [${log.level}] ${log.message}` + (log.details ? `\n  ${log.details.replace(/\n/g, '\n  ')}` : '')
        ).join('\n');
        navigator.clipboard.writeText(formattedLogs);
        setStatusMessage('Logs copied to clipboard!');
        setTimeout(() => setStatusMessage(''), 2000);
    };

    const handleClearLogs = async () => {
        await window.electronAPI.clearLogs();
        setLogs(await window.electronAPI.getInitialLogs()); // Refetch cleared logs
        setStatusMessage('Logs cleared.');
        setTimeout(() => setStatusMessage(''), 2000);
    };

    const filteredLogs = useMemo(() => {
        const lowerCaseQuery = searchQuery.toLowerCase();
        return logs.filter(log => {
            if (!levelFilters.has(log.level)) return false;
            if (searchQuery && !(log.message.toLowerCase().includes(lowerCaseQuery) || log.details?.toLowerCase().includes(lowerCaseQuery))) {
                return false;
            }
            return true;
        });
    }, [logs, searchQuery, levelFilters]);

    return (
        <div className="container mx-auto flex flex-col" style={{ height: 'calc(100vh - 4.5rem)'}}>
            <header className="mb-6">
                <h1 className="text-3xl font-bold text-gray-100">System Logs</h1>
                <p className="text-gray-400 mt-1">Real-time logs from the application backend.</p>
            </header>
            
            <div className="bg-primary p-4 rounded-lg shadow-md flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-4">
                    <div className="relative w-full sm:max-w-xs">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
                        </div>
                        <input type="search" placeholder="Search logs..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-primary-light border border-primary rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-accent/50"/>
                    </div>
                     <div className="flex items-center gap-2">
                        {(['INFO', 'WARN', 'ERROR'] as LogEntry['level'][]).map(level => (
                            <button key={level} onClick={() => handleLevelFilterChange(level)}
                                className={`px-3 py-1 text-sm rounded-full border-2 transition-colors ${levelFilters.has(level) ? 'border-accent text-accent bg-accent/10' : 'border-primary-light text-gray-400 hover:bg-primary-light'}`}>
                                {level}
                            </button>
                        ))}
                    </div>
                </div>
                 <div className="flex items-center gap-2">
                    <button onClick={handleCopyLogs} className="flex items-center gap-2 px-3 py-2 text-sm bg-primary-light text-gray-200 rounded-md hover:bg-gray-600 transition-colors"><ClipboardDocumentIcon className="w-4 h-4" /> Copy</button>
                    <button onClick={fetchLogs} className="p-2 text-gray-200 bg-primary-light rounded-md hover:bg-gray-600 transition-colors"><ArrowPathIcon className="w-5 h-5" /></button>
                    <button onClick={handleClearLogs} className="p-2 text-red-400 bg-primary-light rounded-md hover:bg-red-500/20 transition-colors"><TrashIcon className="w-5 h-5" /></button>
                 </div>
            </div>

            <main ref={logContainerRef} className="bg-charcoal border-2 border-primary rounded-lg p-2 font-mono text-xs flex-grow overflow-y-auto">
                {isLoading ? <SpinnerIcon isLarge /> : 
                filteredLogs.length > 0 ? (
                    filteredLogs.map((log, i) => (
                        <div key={i} className={`whitespace-pre-wrap break-words border-l-2 pl-2 mb-1 ${
                            log.level === 'ERROR' ? 'border-red-500' : 
                            log.level === 'WARN' ? 'border-yellow-500' :
                            'border-gray-600'
                        }`}>
                            <span className="text-gray-500">{new Date(log.timestamp).toLocaleTimeString()} </span>
                            <LogLevelPill level={log.level} />
                            <span className="text-gray-300 ml-2">{log.message}</span>
                            {log.details && <div className="text-gray-500 pl-4 py-1 opacity-80 bg-primary/20 rounded-md mt-1">{log.details}</div>}
                        </div>
                    ))
                ) : (
                    <p className="text-gray-500 text-center text-base font-sans p-8">No logs match your current filters.</p>
                )}
            </main>
            {statusMessage && <div className="text-center text-sm text-accent p-2 animate-pulse">{statusMessage}</div>}
        </div>
    );
};

export default Logs;