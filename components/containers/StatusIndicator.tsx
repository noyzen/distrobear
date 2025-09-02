import React from 'react';
import { motion } from 'framer-motion';

const StatusIndicator: React.FC<{ status: string }> = ({ status }) => {
  const isUp = status.toLowerCase().startsWith('up');

  if (isUp) {
    return (
      <div className="flex-shrink-0 w-8 flex items-center justify-center" title="Running">
        <motion.div
          className="w-4 h-4 rounded-full bg-accent shadow-[0_0_10px_theme(colors.accent.light),0_0_4px_theme(colors.accent.dark)]"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [1, 0.7, 1],
          }}
          transition={{
            duration: 2,
            ease: "easeInOut",
            repeat: Infinity,
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 w-8 flex items-center justify-center" title="Stopped">
      <div className="h-3 w-3 rounded-full bg-gray-500"></div>
    </div>
  );
};

export default StatusIndicator;