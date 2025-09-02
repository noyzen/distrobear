import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion } from 'framer-motion';
import SpinnerIcon from '../shared/SpinnerIcon';
import { PlayIcon } from '../Icons';

interface StartContainersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  containersToStart: string[];
}

const StartContainersModal: React.FC<StartContainersModalProps> = ({ isOpen, onClose, onConfirm, containersToStart }) => {
    const [isStarting, setIsStarting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleConfirm = async () => {
        setIsStarting(true);
        setError(null);
        try {
            await onConfirm();
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsStarting(false);
        }
    };
    
    useEffect(() => {
        if (!isOpen) {
            setIsStarting(false);
            setError(null);
        }
    }, [isOpen]);

    const modalRoot = document.getElementById('modal-root');
    if (!isOpen || !modalRoot) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        className="bg-primary-light rounded-lg shadow-xl p-6 w-full max-w-lg border border-primary"
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        <h2 className="text-2xl font-bold text-gray-100">Start Containers?</h2>
        <p className="text-gray-400 mt-4">The following containers must be running to be scanned for applications:</p>
        <ul className="list-disc list-inside bg-primary rounded-md p-3 my-4 text-gray-300 space-y-1">
            {containersToStart.map(name => <li key={name}>{name}</li>)}
        </ul>

        {error && (
            <div className="mt-4 p-3 bg-red-900/50 text-red-300 text-xs rounded-md border border-red-700/50">
                <p className="font-sans font-bold mb-1">Failed to start containers</p>
                <pre className="whitespace-pre-wrap break-words font-mono">{error}</pre>
            </div>
        )}
        
        <div className="flex justify-end gap-4 mt-8">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            disabled={isStarting}
            className="px-6 py-2 bg-primary text-gray-200 font-semibold rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            Cancel
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleConfirm}
            disabled={isStarting}
            className="px-6 py-2 bg-accent text-charcoal font-semibold rounded-lg hover:bg-accent-light transition-colors flex items-center justify-center gap-2 disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {isStarting ? <SpinnerIcon /> : <PlayIcon className="w-5 h-5"/>}
            {isStarting ? 'Starting...' : 'Start & Scan'}
          </motion.button>
        </div>
      </motion.div>
    </div>,
    modalRoot
  );
};

export default StartContainersModal;
