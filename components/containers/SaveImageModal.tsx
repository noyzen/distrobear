import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion } from 'framer-motion';

interface SaveImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (imageName: string, imageTag: string) => Promise<void>;
  containerName: string;
}

const SaveImageModal: React.FC<SaveImageModalProps> = ({ isOpen, onClose, onSave, containerName }) => {
  const [imageName, setImageName] = useState(`${containerName}-snapshot`);
  const [imageTag, setImageTag] = useState('latest');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setImageName(`${containerName}-snapshot`);
      setImageTag('latest');
      setIsSaving(false);
      setError(null);
    }
  }, [isOpen, containerName]);

  const handleSave = async () => {
    setError(null);
    setIsSaving(true);
    try {
      await onSave(imageName, imageTag);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsSaving(false);
    }
  };
  
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
        <h2 className="text-2xl font-bold text-gray-100">Save "{containerName}" as Image</h2>
        <p className="text-gray-400 mt-2 text-sm">This will create a new local image from the container's current state. This image can be used to create new containers.</p>
        
        <div className="space-y-4 mt-6">
          <div>
            <label htmlFor="imageName" className="block text-sm font-medium text-gray-300 mb-1">Image Name</label>
            <input
              type="text"
              id="imageName"
              value={imageName}
              onChange={(e) => setImageName(e.target.value)}
              placeholder="e.g., my-custom-ubuntu"
              className="w-full px-3 py-2 bg-primary border border-primary rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-accent/50"
              disabled={isSaving}
            />
          </div>
          <div>
            <label htmlFor="imageTag" className="block text-sm font-medium text-gray-300 mb-1">Tag</label>
            <input
              type="text"
              id="imageTag"
              value={imageTag}
              onChange={(e) => setImageTag(e.target.value)}
              placeholder="e.g., latest or v1.2"
              className="w-full px-3 py-2 bg-primary border border-primary rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-accent/50"
              disabled={isSaving}
            />
          </div>
        </div>

        {error && (
            <div className="mt-4 p-3 bg-red-900/50 text-red-300 text-xs rounded-md border border-red-700/50">
                <p className="font-sans font-bold mb-1">Save Failed</p>
                <pre className="whitespace-pre-wrap break-words font-mono">{error}</pre>
            </div>
        )}

        <div className="flex justify-end gap-4 mt-8">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            disabled={isSaving}
            className="px-6 py-2 bg-primary text-gray-200 font-semibold rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            Cancel
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSave}
            disabled={isSaving || !imageName || !imageTag}
            className="px-6 py-2 bg-accent text-charcoal font-semibold rounded-lg hover:bg-accent-light transition-colors disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Image'}
          </motion.button>
        </div>
      </motion.div>
    </div>,
    modalRoot
  );
};

export default SaveImageModal;
