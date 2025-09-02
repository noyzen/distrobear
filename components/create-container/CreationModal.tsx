import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircleIcon, ExclamationCircleIcon } from '../Icons';

interface CreationModalProps {
  isOpen: boolean;
  logs: string[];
  error: string | null;
  success: boolean;
  isCreating: boolean;
  onClose: () => void;
  onFinish: () => void;
}

const CreationModal: React.FC<CreationModalProps> = ({ isOpen, logs, error, success, isCreating, onClose, onFinish }) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const modalRoot = document.getElementById('modal-root');
  if (!isOpen || !modalRoot) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <motion.div
        className="bg-primary-light rounded-lg shadow-xl w-full max-w-3xl border border-primary flex flex-col"
        style={{ height: '70vh' }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        <header className="p-4 border-b border-primary flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-100">Creating Container...</h2>
        </header>
        
        <main ref={logContainerRef} className="overflow-y-auto p-4 font-mono text-sm text-gray-300 flex-grow">
          <pre className="whitespace-pre-wrap break-words">{logs.join('')}</pre>
        </main>

        <AnimatePresence>
          {(success || error) && (
            <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex-shrink-0"
            >
              {success && (
                <div className="m-4 p-4 bg-accent/20 border border-accent/50 text-accent rounded-lg flex items-center gap-3">
                  <CheckCircleIcon className="w-8 h-8"/>
                  <div>
                    <h3 className="font-bold">Success!</h3>
                    <p>The container was created successfully.</p>
                  </div>
                </div>
              )}
              {error && (
                <div className="m-4 p-4 bg-red-900/50 border border-red-700/50 text-red-300 rounded-lg">
                  <div className="flex items-center gap-3">
                    <ExclamationCircleIcon className="w-8 h-8"/>
                    <h3 className="font-bold">Creation Failed</h3>
                  </div>
                  <pre className="mt-2 font-mono text-xs whitespace-pre-wrap">{error}</pre>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="p-4 border-t border-primary flex justify-end gap-4 flex-shrink-0">
          {isCreating ? (
            <p className="text-gray-400 text-sm animate-pulse">Creation in progress...</p>
          ) : (
            <>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="px-6 py-2 bg-primary text-gray-200 font-semibold rounded-lg hover:bg-gray-600 transition-colors"
              >
                {success ? 'Create Another' : 'Close'}
              </motion.button>
              {success && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onFinish}
                  className="px-6 py-2 bg-accent text-charcoal font-semibold rounded-lg hover:bg-accent-light transition-colors"
                >
                  Go to My Containers
                </motion.button>
              )}
            </>
          )}
        </footer>
      </motion.div>
    </div>,
    modalRoot
  );
};

export default CreationModal;
