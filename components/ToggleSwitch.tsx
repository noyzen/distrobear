import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ToggleSwitchProps {
  isOn: boolean;
  onToggle: () => void;
  disabled?: boolean;
  onLabel?: string;
  offLabel?: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ isOn, onToggle, disabled, onLabel = 'ON', offLabel = 'OFF' }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isOn}
      onClick={onToggle}
      disabled={disabled}
      className={`relative inline-flex items-center h-8 w-16 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-primary-light focus:ring-accent/50 ${
        isOn ? 'bg-accent' : 'bg-primary'
      } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
    >
      <span className="sr-only">Toggle</span>
      
      <AnimatePresence initial={false} mode="wait">
        <motion.span
            key={isOn ? onLabel : offLabel}
            className={`absolute text-xs font-bold ${isOn ? 'right-[9px] text-charcoal' : 'left-[9px] text-gray-300'}`}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
        >
            {isOn ? onLabel : offLabel}
        </motion.span>
      </AnimatePresence>

      <motion.span
        className="absolute left-1 inline-block w-6 h-6 transform bg-white rounded-full shadow-md"
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        initial={false}
        animate={{ x: isOn ? '2.25rem' : '0rem' }}
      />
    </button>
  );
};

export default ToggleSwitch;