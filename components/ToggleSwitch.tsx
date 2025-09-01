import React from 'react';
import { motion } from 'framer-motion';

interface ToggleSwitchProps {
  isOn: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ isOn, onToggle, disabled }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isOn}
      onClick={onToggle}
      disabled={disabled}
      className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-primary-light focus:ring-accent/50 ${
        isOn ? 'bg-accent' : 'bg-primary'
      } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
    >
      <span className="sr-only">Toggle</span>
      <motion.span
        className="inline-block w-4 h-4 transform bg-white rounded-full"
        layout
        transition={{ type: 'spring', stiffness: 700, damping: 30 }}
        initial={false}
        animate={{ x: isOn ? '1.5rem' : '0.25rem' }}
      />
    </button>
  );
};

export default ToggleSwitch;
