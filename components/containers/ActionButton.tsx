import React from 'react';
import { motion } from 'framer-motion';

const ActionButton: React.FC<{ onClick: (e: React.MouseEvent) => void; disabled: boolean; children: React.ReactNode; primary?: boolean; isStopButton?: boolean, icon?: React.ReactNode }> = ({ onClick, disabled, children, primary = false, isStopButton = false, icon }) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    onClick={onClick}
    disabled={disabled}
    className={`w-28 flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold rounded-md transition-all duration-200 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed
      ${primary ? 'bg-accent text-charcoal hover:bg-accent-light' : ''}
      ${isStopButton ? 'bg-red-600 text-white hover:bg-red-500' : ''}
      `}
  >
    {icon && !String(children).includes('...') && <span>{icon}</span>}
    {children}
  </motion.button>
);

export default ActionButton;
