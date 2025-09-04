import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LocalImage } from '../../types';
import DistroIcon from '../DistroLogo';
import ConfirmationModal from '../shared/ConfirmationModal';
import SpinnerIcon from '../shared/SpinnerIcon';
import { ArrowUpOnSquareIcon, TrashIcon } from '../Icons';

const listItemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 }
};

interface ImageRowProps {
  image: LocalImage;
  onActionComplete: () => void;
  onActionStart: () => void;
  onActionError: (error: string) => void;
}

const ImageRow: React.FC<ImageRowProps> = ({ image, onActionComplete, onActionStart, onActionError }) => {
  const [isProcessing, setIsProcessing] = useState< 'delete' | 'export' | null>(null);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const imageIdentifier = `${image.repository}:${image.tag}`;

  const handleDelete = async () => {
    setIsProcessing('delete');
    onActionStart();
    try {
      await window.electronAPI.imageDelete(imageIdentifier);
      onActionComplete();
    } catch (err) {
      onActionError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsProcessing(null);
    }
  };

  const handleExport = async () => {
    setIsProcessing('export');
    onActionStart();
    try {
        const result = await window.electronAPI.imageExport(imageIdentifier);
        if (result.success) {
            // Success message is handled by the parent
            onActionComplete();
        } else {
            // Don't show an error for user cancellation
            if (result.message && !result.message.includes('canceled')) {
                onActionError(result.message);
            }
        }
    } catch (err) {
        onActionError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
        setIsProcessing(null);
    }
  };

  return (
    <>
      <motion.div
        layout="position"
        variants={listItemVariants}
        className="grid grid-cols-12 items-center p-4 border-b border-primary-light transition-colors duration-200 hover:bg-primary-light/50 gap-4"
      >
        <div className="col-span-12 md:col-span-5 min-w-0 flex items-center gap-3">
          <DistroIcon identifier={image.repository} className="w-10 h-10 flex-shrink-0" />
          <div className="min-w-0">
            <p className="font-bold text-gray-100 truncate" title={imageIdentifier}>{image.repository}:{image.tag}</p>
            <p className="text-xs text-gray-400 mt-1 truncate" title={image.id}>ID: {image.id.substring(0, 12)}</p>
          </div>
        </div>
        <div className="col-span-4 md:col-span-2 text-sm text-gray-300">{image.size}</div>
        <div className="col-span-8 md:col-span-2 text-sm text-gray-400">{image.created}</div>
        <div className="col-span-12 md:col-span-3 flex justify-end gap-2">
            <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleExport}
                disabled={!!isProcessing}
                className="p-2 text-gray-300 rounded-md hover:bg-blue-600 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Export image to .tar">
                {isProcessing === 'export' ? <SpinnerIcon /> : <ArrowUpOnSquareIcon className="w-5 h-5"/>}
            </motion.button>
             <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setDeleteModalOpen(true)}
                disabled={!!isProcessing}
                className="p-2 text-gray-300 rounded-md hover:bg-red-600 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Delete image">
                {isProcessing === 'delete' ? <SpinnerIcon /> : <TrashIcon className="w-5 h-5"/>}
            </motion.button>
        </div>
      </motion.div>
       <AnimatePresence>
        {isDeleteModalOpen && (
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={handleDelete}
                title={`Delete Image?`}
                message={`Are you sure you want to permanently delete "${imageIdentifier}"? This cannot be undone.`}
            />
        )}
      </AnimatePresence>
    </>
  );
};

export default ImageRow;
