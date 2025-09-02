import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { ExportableApplication } from '../../types';
import SpinnerIcon from '../shared/SpinnerIcon';
import { TrashIcon, ArrowUpOnSquareIcon } from '../Icons';

const listItemVariants = {
  hidden: { x: -20, opacity: 0 },
  visible: { x: 0, opacity: 1 }
};

interface ApplicationRowProps {
  app: ExportableApplication;
  onActionComplete: () => void;
}

const ApplicationRow: React.FC<ApplicationRowProps> = ({ app, onActionComplete }) => {
  const [processingAction, setProcessingAction] = useState<'share' | 'unshare' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleShare = async () => {
    setProcessingAction('share');
    setError(null);
    try {
      await window.electronAPI.applicationExport({ containerName: app.containerName, appName: app.appName });
      onActionComplete();
    } catch (err) {
      console.error(`Failed to share ${app.name}:`, err);
      setError(err instanceof Error ? err.message : "An unknown error occurred while sharing.");
    } finally {
      setProcessingAction(null);
    }
  };

  const handleUnshare = async () => {
    setProcessingAction('unshare');
    setError(null);
    try {
      await window.electronAPI.applicationUnexport({ containerName: app.containerName, appName: app.appName });
      onActionComplete();
    } catch (err) {
      console.error(`Failed to unshare ${app.name}:`, err);
      setError(err instanceof Error ? err.message : "An unknown error occurred while unsharing.");
    } finally {
      setProcessingAction(null);
    }
  };

  return (
    <motion.div
      layout="position"
      variants={listItemVariants}
      className="flex items-center p-4 border-b border-primary-light transition-colors duration-200 hover:bg-primary-light/50"
    >
      <div className="flex-1 min-w-0">
        <h3 className="text-md font-bold text-gray-100 truncate">{app.name}</h3>
        <p className="text-xs text-gray-400 mt-1 truncate" title={app.containerName}>
          in <span className="font-semibold">{app.containerName}</span>
        </p>
         {error && (
            <div className="mt-2 p-2 bg-red-900/50 text-red-300 text-xs rounded-md border border-red-700/50">
                <pre className="whitespace-pre-wrap break-words font-mono">{error}</pre>
            </div>
        )}
      </div>
      <div className="flex-shrink-0 ml-4">
        {app.isExported ? (
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleUnshare}
                disabled={!!processingAction}
                className="w-32 flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold rounded-md transition-all duration-200 bg-red-600 text-white hover:bg-red-500 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed"
                title={`Unshare ${app.name} from the host.`}
            >
            {processingAction === 'unshare' ? <SpinnerIcon /> : <><TrashIcon className="w-5 h-5"/> Unshare</>}
            </motion.button>
        ) : (
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleShare}
                disabled={!!processingAction}
                className="w-32 flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold rounded-md transition-all duration-200 bg-accent text-charcoal hover:bg-accent-light disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed"
                title={`Share ${app.name} with the host.`}
            >
            {processingAction === 'share' ? <SpinnerIcon /> : <><ArrowUpOnSquareIcon /> Share</>}
            </motion.button>
        )}
      </div>
    </motion.div>
  );
};

export default ApplicationRow;