import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Container } from '../../types';
import ToggleSwitch from '../ToggleSwitch';
import DistroIcon from '../DistroLogo';
import StatusIndicator from './StatusIndicator';
import ActionButton from './ActionButton';
import ContainerInfoModal from './ContainerInfoModal';
import SaveImageModal from './SaveImageModal';
import ConfirmationModal from '../shared/ConfirmationModal';
import { 
    ChevronDownIcon, 
    ShieldCheckIcon, 
    BoltIcon, 
    StopIcon, 
    PlayIcon, 
    CommandLineIcon, 
    InformationCircleIcon,
    ArchiveBoxArrowDownIcon,
    TrashIcon
} from '../Icons';


const listItemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 }
};

interface ContainerRowProps {
  container: Container;
  isSelected: boolean;
  onSelect: () => void;
  onActionComplete: () => void;
  isLast: boolean;
}

const ContainerRow: React.FC<ContainerRowProps> = ({ container, isSelected, onSelect, onActionComplete, isLast }) => {
  const [isActionInProgress, setIsActionInProgress] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isSaveImageModalOpen, setSaveImageModalOpen] = useState(false);
  const [isInfoModalOpen, setInfoModalOpen] = useState(false);
  const [optimisticAutostartEnabled, setOptimisticAutostartEnabled] = useState(container.isAutostartEnabled);

  useEffect(() => {
    setOptimisticAutostartEnabled(container.isAutostartEnabled);
  }, [container.isAutostartEnabled]);
  
  const isUp = container.status.toLowerCase().startsWith('up');

  const performAction = async (action: 'start' | 'stop' | 'autostart-enable' | 'autostart-disable' | 'delete') => {
    setIsActionInProgress(true);
    setActionError(null);
    try {
      switch(action) {
        case 'start': await window.electronAPI.containerStart(container.name); break;
        case 'stop': await window.electronAPI.containerStop(container.name); break;
        case 'autostart-enable': await window.electronAPI.containerAutostartEnable(container.name); break;
        case 'autostart-disable': await window.electronAPI.containerAutostartDisable(container.name); break;
        case 'delete': await window.electronAPI.containerDelete(container.name); break;
      }
      onActionComplete();
    } catch (err) {
      console.error(`Failed to ${action} container:`, err);
      setActionError(err instanceof Error ? err.message : "An unknown error occurred.");
      if (action.startsWith('autostart')) {
        setOptimisticAutostartEnabled(container.isAutostartEnabled);
      }
    } finally {
      setIsActionInProgress(false);
    }
  };

  const handleActionClick = (e: React.MouseEvent, action: 'start' | 'stop') => {
      e.stopPropagation();
      performAction(action);
  }

  const handleEnterClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setActionError(null);
    try {
        await window.electronAPI.containerEnter(container.name);
        if (!isUp) {
            setTimeout(() => onActionComplete(), 500);
        }
    } catch (err) {
        console.error(`Failed to enter container:`, err);
        setActionError(err instanceof Error ? err.message : "An unknown error occurred.");
    }
  };

  const handleAutostartToggle = () => {
    if (isActionInProgress) return;
    const newAutostartState = !optimisticAutostartEnabled;
    setOptimisticAutostartEnabled(newAutostartState);
    performAction(newAutostartState ? 'autostart-enable' : 'autostart-disable');
  };

  const handleConfirmDelete = () => {
    performAction('delete');
  };
  
  const handleSaveImage = (imageName: string, imageTag: string) => {
    return new Promise<void>(async (resolve, reject) => {
        try {
            await window.electronAPI.containerCommit(container.name, imageName, imageTag);
            resolve();
        } catch (err) {
            console.error(`Failed to save container as image:`, err);
            reject(err);
        }
    });
  };

  return (
    <motion.div 
        layout="position"
        variants={listItemVariants}
        className={`
            relative
            ${ isSelected
                ? 'z-10 my-1 bg-primary-light rounded-lg border-2 border-accent/70 shadow-[0_0_15px_rgba(52,211,153,0.3)]'
                : `z-0 border-b ${isLast ? 'border-transparent' : 'border-primary-light'}`
            }
        `}
    >
      <motion.div
        whileHover={!isSelected ? { y: -2, transition: { duration: 0.2 } } : {}}
        onClick={onSelect}
        className={`flex items-center p-4 cursor-pointer transition-colors duration-200
            ${ isSelected ? 'rounded-t-lg' : 'hover:bg-primary-light/50' }
        `}
      >
        <StatusIndicator status={container.status} />
        <DistroIcon identifier={container.image} className="w-10 h-10 mx-3 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-gray-100 truncate">{container.name}</h3>
            {container.isIsolated && <ShieldCheckIcon className="w-4 h-4 text-cyan-400 flex-shrink-0" title="Isolated Home Directory" />}
            {optimisticAutostartEnabled && <BoltIcon className="w-4 h-4 text-yellow-400 flex-shrink-0" title="Autostart Enabled" />}
          </div>
          <p className="text-xs text-gray-400 mt-1 truncate" title={container.image}>{container.image}</p>
        </div>
        <p className="flex-shrink-0 hidden md:block text-sm text-gray-400 mx-4 min-w-0 truncate" title={container.status}>{container.status}</p>
        <div className="flex-shrink-0">
          <ChevronDownIcon isSelected={isSelected} />
        </div>
      </motion.div>
      <AnimatePresence initial={false}>
        {isSelected && (
          <motion.section
            key="content"
            initial="collapsed"
            animate="open"
            exit="collapsed"
            variants={{
              open: { opacity: 1, height: 'auto' },
              collapsed: { opacity: 0, height: 0 }
            }}
            transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
            className="overflow-hidden bg-primary rounded-b-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 space-y-4 divide-y divide-primary-light">
                <div className="flex flex-wrap items-center justify-center pt-2 gap-4">
                    {isUp ? (
                        <ActionButton onClick={(e) => handleActionClick(e, 'stop')} disabled={isActionInProgress} isStopButton icon={<StopIcon className="w-4 h-4" />}>
                        {isActionInProgress ? '...' : 'Stop'}
                        </ActionButton>
                    ) : (
                        <ActionButton onClick={(e) => handleActionClick(e, 'start')} disabled={isActionInProgress} primary icon={<PlayIcon className="w-4 h-4" />}>
                        {isActionInProgress ? '...' : 'Start'}
                        </ActionButton>
                    )}
                     <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                        onClick={(e) => handleEnterClick(e)}
                        disabled={isActionInProgress}
                        className="w-28 flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold rounded-md transition-all duration-200 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed bg-primary-light text-gray-200 hover:bg-gray-500"
                        title="Open a terminal in this container"
                    >
                        <CommandLineIcon className="w-4 h-4" />
                        Enter
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                        onClick={() => setInfoModalOpen(true)}
                        className="w-28 flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold rounded-md transition-all duration-200 bg-primary-light text-gray-200 hover:bg-gray-500"
                        title="Show detailed container information"
                    >
                        <InformationCircleIcon className="w-4 h-4" />
                        Info
                    </motion.button>
                </div>

                <div className="flex items-center justify-between pt-4">
                    <div className="text-sm">
                        <p className="font-semibold text-gray-200">Autostart on Boot</p>
                        <p className="text-xs text-gray-400">Requires Podman & systemd</p>
                    </div>
                    <ToggleSwitch isOn={optimisticAutostartEnabled} onToggle={handleAutostartToggle} disabled={isActionInProgress} />
                </div>

                <div className="pt-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-semibold text-gray-200">Export Container</p>
                            <p className="text-xs text-gray-400">Save current state as a new local image.</p>
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                            onClick={() => setSaveImageModalOpen(true)}
                            disabled={isActionInProgress || !isUp}
                            title={!isUp ? "Container must be running to save it as an image." : "Save a snapshot of the running container"}
                            className="px-4 py-2 text-sm font-bold rounded-md transition-all duration-200 bg-blue-600 text-white hover:bg-blue-500 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <ArchiveBoxArrowDownIcon /> Save as Image
                        </motion.button>
                    </div>
                     {!isUp && (
                        <p className="text-xs text-gray-400 text-right mt-1">
                            Container must be running to save as an image.
                        </p>
                    )}
                </div>
                
                <div className="pt-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-semibold text-red-400">Danger Zone</p>
                            <p className="text-xs text-gray-500">This action cannot be undone.</p>
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                            onClick={() => setDeleteModalOpen(true)}
                            disabled={isActionInProgress}
                            className="px-4 py-2 text-sm font-bold rounded-md transition-all duration-200 bg-red-600 text-white hover:bg-red-500 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <TrashIcon /> Delete
                        </motion.button>
                    </div>
                </div>
            </div>

            {actionError && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="px-4 pb-4 pt-4"
              >
                <div className="p-3 bg-red-900/50 text-red-300 text-xs rounded-md border border-red-700/50">
                    <p className="font-sans font-bold mb-1">Action Failed</p>
                    <pre className="whitespace-pre-wrap break-words font-mono">{actionError}</pre>
                </div>
              </motion.div>
            )}
          </motion.section>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isDeleteModalOpen && (
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title={`Delete "${container.name}"?`}
                message="Are you sure? All data inside this container will be permanently lost."
            />
        )}
        {isSaveImageModalOpen && (
            <SaveImageModal
                isOpen={isSaveImageModalOpen}
                onClose={() => setSaveImageModalOpen(false)}
                onSave={handleSaveImage}
                containerName={container.name}
            />
        )}
        {isInfoModalOpen && (
            <ContainerInfoModal
                isOpen={isInfoModalOpen}
                onClose={() => setInfoModalOpen(false)}
                containerName={container.name}
            />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ContainerRow;
