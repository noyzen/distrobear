import React from 'react';

const StatusIndicator: React.FC<{ status: string }> = ({ status }) => {
  const isUp = status.toLowerCase().startsWith('up');
  return (
    <div className="flex-shrink-0 w-8 text-center">
      <div className={`h-3 w-3 rounded-full mx-auto ${isUp ? 'bg-accent' : 'bg-gray-500'} ${isUp ? 'animate-pulse' : ''}`} title={isUp ? 'Running' : 'Stopped'}></div>
    </div>
  );
};

export default StatusIndicator;
