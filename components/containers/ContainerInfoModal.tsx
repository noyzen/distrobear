import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion } from 'framer-motion';
import type { ContainerInfo } from '../../types';

interface ContainerInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  containerName: string;
}

const DetailItem: React.FC<{label: string, value: React.ReactNode, isCode?: boolean}> = ({ label, value, isCode }) => (
    <div className="py-2">
        <div className="text-sm font-medium text-gray-400">{label}</div>
        <div className={`text-sm text-gray-200 break-words ${isCode ? 'font-mono' : ''}`}>{value || 'N/A'}</div>
    </div>
);

const BooleanPill: React.FC<{value: boolean, label: string}> = ({value, label}) => (
    <div className="flex items-center justify-between py-2">
        <div className="text-sm font-medium text-gray-400">{label}</div>
        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${value ? 'bg-accent/20 text-accent' : 'bg-gray-600/50 text-gray-300'}`}>
            {value ? 'Enabled' : 'Disabled'}
        </span>
    </div>
);

const ContainerInfoModal: React.FC<ContainerInfoModalProps> = ({ isOpen, onClose, containerName }) => {
  const [info, setInfo] = useState<ContainerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const fetchInfo = async () => {
        setIsLoading(true);
        setError(null);
        setInfo(null);
        try {
          const result = await window.electronAPI.containerInfo(containerName);
          setInfo(result);
        } catch (err) {
          setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
          setIsLoading(false);
        }
      };
      fetchInfo();
    }
  }, [isOpen, containerName]);

  const modalRoot = document.getElementById('modal-root');
  if (!isOpen || !modalRoot) return null;

  const renderContent = () => {
    if (isLoading) {
        return <p className="text-center text-gray-400 animate-pulse p-8">Loading details...</p>;
    }
    if (error) {
        return (
            <div className="p-4 m-6 bg-red-900/50 text-red-300 text-sm rounded-md border border-red-700/50">
                <p className="font-sans font-bold mb-1">Failed to load info</p>
                <pre className="whitespace-pre-wrap break-words font-mono">{error}</pre>
            </div>
        );
    }
    if (info) {
        return (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                {/* Left Column */}
                <div className="space-y-4">
                    <section>
                        <h3 className="text-lg font-semibold text-gray-300 border-b border-primary pb-2 mb-2">Overview</h3>
                        <DetailItem label="ID" value={info.id} isCode />
                        <DetailItem label="Status" value={info.status} />
                        <DetailItem label="Backend" value={info.backend} isCode />
                        <DetailItem label="PID" value={info.pid > 0 ? info.pid : 'N/A'} />
                        <DetailItem label="Created" value={new Date(info.created).toLocaleString()} />
                        {info.size && info.size !== 'N/A' && <DetailItem label="Size" value={info.size} />}
                    </section>
                     <section>
                        <h3 className="text-lg font-semibold text-gray-300 border-b border-primary pb-2 mb-2">Configuration</h3>
                        <BooleanPill label="Init Process" value={info.init} />
                        <BooleanPill label="Root Mode" value={info.root} />
                        <BooleanPill label="NVIDIA Runtime" value={info.nvidia} />
                    </section>
                </div>
                {/* Right Column */}
                <div className="space-y-4">
                    <section>
                        <h3 className="text-lg font-semibold text-gray-300 border-b border-primary pb-2 mb-2">Image & User</h3>
                        <DetailItem label="Image" value={info.image} isCode />
                        <DetailItem label="Entrypoint" value={info.entrypoint} isCode />
                        <DetailItem label="User" value={info.user_name} isCode />
                        <DetailItem label="Hostname" value={info.hostname} isCode />
                        <DetailItem label="Home Directory (in Container)" value={info.home_dir} isCode />
                    </section>
                    <section>
                        <h3 className="text-lg font-semibold text-gray-300 border-b border-primary pb-2 mb-2">Mounted Volumes</h3>
                         <div className="text-xs text-gray-200 font-mono bg-primary-dark/50 rounded-lg p-3 h-48 overflow-y-auto">
                            {info.volumes && info.volumes.length > 0 ? (
                                <ul className="space-y-1">
                                    {info.volumes.map((vol, i) => <li key={i}>{vol}</li>)}
                                </ul>
                            ) : (
                                <p className="text-gray-500 normal-case">No custom volumes mounted.</p>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        );
    }
    return null;
  }
  
  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        className="bg-primary-light rounded-lg shadow-xl w-full max-w-4xl border border-primary flex flex-col"
        style={{ maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        <header className="p-4 border-b border-primary flex-shrink-0">
            <h2 className="text-xl font-bold text-gray-100">
                Container Info: <span className="text-accent">{containerName}</span>
            </h2>
        </header>
        
        <main className="overflow-y-auto">
            {renderContent()}
        </main>

        <footer className="p-4 border-t border-primary flex justify-end flex-shrink-0">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="px-6 py-2 bg-primary text-gray-200 font-semibold rounded-lg hover:bg-gray-600 transition-colors"
          >
            Close
          </motion.button>
        </footer>
      </motion.div>
    </div>,
    modalRoot
  );
};

export default ContainerInfoModal;
