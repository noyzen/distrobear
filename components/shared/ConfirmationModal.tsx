import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion } from 'framer-motion';
import { ExclamationTriangleIcon, TrashIcon } from '../Icons';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const modalRoot = document.getElementById('modal-root');
  if (!isOpen || !modalRoot) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        className="bg-primary-light rounded-lg shadow-xl p-6 w-full max-w-md border border-primary"
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        <div className="flex items-start gap-4">
            <div className="w-8 h-8 text-red-500 flex-shrink-0 mt-1"><ExclamationTriangleIcon /></div>
            <div>
                <h2 className="text-2xl font-bold text-gray-100">{title}</h2>
                <p className="text-gray-400 mt-4">{message}</p>
            </div>
        </div>
        <div className="flex justify-end gap-4 mt-8">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="px-6 py-2 bg-primary text-gray-200 font-semibold rounded-lg hover:bg-gray-600 transition-colors"
          >
            Cancel
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { onConfirm(); onClose(); }}
            className="px-6 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-500 transition-colors flex items-center justify-center gap-2"
          >
            <TrashIcon /> Delete
          </motion.button>
        </div>
      </motion.div>
    </div>,
    modalRoot
  );
};

export default ConfirmationModal;
