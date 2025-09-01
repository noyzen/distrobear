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
      className={`relative inline-flex items-center h-6 w-11 flex-shrink-0 rounded-full border-2 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-primary-light focus:ring-accent/50 ${
        isOn ? 'bg-accent border-transparent' : 'bg-primary-dark border-primary-light'
      } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
    >
      <span className="sr-only">Toggle</span>
      
      <motion.span
        className="absolute left-0.5 inline-block w-5 h-5 transform bg-white rounded-full shadow-md"
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        initial={false}
        animate={{ x: isOn ? '1rem' : '0rem' }} // Adjusted for border-2
      />
    </button>
  );
};

export default ToggleSwitch;