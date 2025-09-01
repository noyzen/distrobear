import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

// --- Helper Components & Icons ---

const PullModal: React.FC<{
  isOpen: boolean;
  logs: string[];
  error: string | null;
  success: boolean;
  isPulling: boolean;
  onClose: () => void;
}> = ({ isOpen, logs, error, success, isPulling, onClose }) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const modalRoot = document.getElementById('modal-root');
  if (!isOpen || !modalRoot) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <motion.div
        className="bg-primary-light rounded-lg shadow-xl w-full max-w-3xl border border-primary flex flex-col"
        style={{ height: '70vh' }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        <header className="p-4 border-b border-primary flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-100">Downloading Image...</h2>
        </header>
        
        <main ref={logContainerRef} className="overflow-y-auto p-4 font-mono text-sm text-gray-300 flex-grow">
          <pre className="whitespace-pre-wrap break-words">{logs.join('')}</pre>
        </main>

        <AnimatePresence>
          {(success || error) && (
            <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex-shrink-0"
            >
              {success && (
                <div className="m-4 p-4 bg-accent/20 border border-accent/50 text-accent rounded-lg flex items-center gap-3">
                  <CheckCircleIcon className="w-8 h-8"/>
                  <div>
                    <h3 className="font-bold">Success!</h3>
                    <p>The image was downloaded successfully.</p>
                  </div>
                </div>
              )}
              {error && (
                <div className="m-4 p-4 bg-red-900/50 border border-red-700/50 text-red-300 rounded-lg">
                  <div className="flex items-center gap-3">
                    <ExclamationCircleIcon className="w-8 h-8"/>
                    <h3 className="font-bold">Download Failed</h3>
                  </div>
                  <pre className="mt-2 font-mono text-xs whitespace-pre-wrap">{error}</pre>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="p-4 border-t border-primary flex justify-end gap-4 flex-shrink-0">
          {isPulling ? (
            <p className="text-gray-400 text-sm animate-pulse">Download in progress...</p>
          ) : (
             <button
                onClick={onClose}
                className="px-6 py-2 bg-primary text-gray-200 font-semibold rounded-lg hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
          )}
        </footer>
      </motion.div>
    </div>,
    modalRoot
  );
};

// --- SVG Logos (Simplified) ---
const AlmaLinuxLogo = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} viewBox="0 0 24 24"><path fill="#00AEEF" d="M12 2L2 7l10 5 10-5-10-5z"/><path fill="#00AEEF" d="M2 17l10 5 10-5-10-5-10 5z"/><path fill="#00AEEF" d="M2 12l10 5 10-5-10-5-10 5z"/></svg>;
const AlpineLogo = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} viewBox="0 0 24 24"><path fill="#0D5983" d="M12 2L2 22h20L12 2zm0 4.5L18.5 20H5.5L12 6.5z"/></svg>;
const AmazonLinuxLogo = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} viewBox="0 0 24 24"><path fill="#FF9900" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-2h2v2h-2zm0-4V7h2v6h-2z"/></svg>;
const ArchLinuxLogo = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} viewBox="0 0 24 24"><path fill="#1793D1" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-4-4h8l-4 4z"/></svg>;
const CentOSLogo = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} viewBox="0 0 24 24"><path fill="#214097" d="M12 2L2 7l10 5 10-5-10-5z"/><path fill="#E12179" d="M2 17l10 5 10-5-10-5-10 5z"/><path fill="#7BC143" d="M2 12l10 5 10-5-10-5-10 5z"/></svg>;
const DebianLogo = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} viewBox="0 0 24 24"><path fill="#A80030" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>;
const FedoraLogo = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} viewBox="0 0 24 24"><path fill="#294172" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-2h2v2h-2zm0-4V7h2v6h-2z"/></svg>;
const OpenSuseLogo = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} viewBox="0 0 24 24"><path fill="#73BA25" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15l-5-5h10l-5 5z"/></svg>;
const RedhatLogo = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} viewBox="0 0 24 24"><path fill="#EE0000" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-2h2v2h-2zm0-4V7h2v6h-2z"/></svg>;
const RockyLinuxLogo = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} viewBox="0 0 24 24"><path fill="#10B981" d="M12 2L2 7l10 5 10-5-10-5z"/><path fill="#10B981" d="M2 17l10 5 10-5-10-5-10 5z"/><path fill="#10B981" d="M2 12l10 5 10-5-10-5-10 5z"/></svg>;
const UbuntuLogo = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} viewBox="0 0 24 24"><circle fill="#E95420" cx="12" cy="12" r="10"/><circle fill="#FFFFFF" cx="12" cy="7" r="2"/><circle fill="#FFFFFF" cx="18" cy="15" r="2"/><circle fill="#FFFFFF" cx="6" cy="15" r="2"/></svg>;
const WolfiLogo = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} viewBox="0 0 24 24"><path fill="#4F46E5" d="M12 2l-10 20h20L12 2zm0 5l6 12H6l6-12z"/></svg>;
const UblueLogo = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} viewBox="0 0 24 24"><path fill="#3B82F6" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-2h2v2h-2zm0-4V7h2v6h-2z"/></svg>;
const GenericLogo = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} viewBox="0 0 24 24"><path fill="currentColor" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" /></svg>;

const CheckCircleIcon = ({ className = "w-6 h-6" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const ExclamationCircleIcon = ({ className = "w-6 h-6" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

// --- Data ---

interface ImageInfo {
  name: string;
  address: string;
  logo: React.FC<React.SVGProps<SVGSVGElement>>;
}

interface ImageCategory {
  category: string;
  images: ImageInfo[];
}

const imageList: ImageCategory[] = [
  { category: "Fedora", images: [
    { name: "Fedora 42", address: "quay.io/fedora/fedora-toolbox:42", logo: FedoraLogo },
    { name: "Fedora 41", address: "quay.io/fedora/fedora-toolbox:41", logo: FedoraLogo },
    { name: "Fedora 40", address: "registry.fedoraproject.org/fedora-toolbox:40", logo: FedoraLogo },
    { name: "Fedora 39", address: "registry.fedoraproject.org/fedora-toolbox:39", logo: FedoraLogo },
  ]},
  { category: "Ubuntu", images: [
    { name: "Ubuntu 25.04", address: "quay.io/toolbx/ubuntu-toolbox:25.04", logo: UbuntuLogo },
    { name: "Ubuntu 24.04", address: "quay.io/toolbx/ubuntu-toolbox:24.04", logo: UbuntuLogo },
    { name: "Ubuntu 22.04", address: "quay.io/toolbx/ubuntu-toolbox:22.04", logo: UbuntuLogo },
    { name: "Ubuntu 20.04", address: "quay.io/toolbx/ubuntu-toolbox:20.04", logo: UbuntuLogo },
  ]},
  { category: "Debian", images: [
    { name: "Debian 13 (Trixie)", address: "quay.io/toolbx-images/debian-toolbox:13", logo: DebianLogo },
    { name: "Debian 12 (Bookworm)", address: "quay.io/toolbx-images/debian-toolbox:12", logo: DebianLogo },
    { name: "Debian 11 (Bullseye)", address: "quay.io/toolbx-images/debian-toolbox:11", logo: DebianLogo },
  ]},
  { category: "Arch Linux", images: [
    { name: "Arch Linux", address: "quay.io/toolbx/arch-toolbox:latest", logo: ArchLinuxLogo },
    { name: "Bazzite (Arch)", address: "ghcr.io/ublue-os/bazzite-arch:latest", logo: ArchLinuxLogo },
  ]},
  { category: "Enterprise Linux", images: [
    { name: "AlmaLinux 9", address: "quay.io/toolbx-images/almalinux-toolbox:9", logo: AlmaLinuxLogo },
    { name: "AlmaLinux 8", address: "quay.io/toolbx-images/almalinux-toolbox:8", logo: AlmaLinuxLogo },
    { name: "Rocky Linux 9", address: "quay.io/toolbx-images/rockylinux-toolbox:9", logo: RockyLinuxLogo },
    { name: "Rocky Linux 8", address: "quay.io/toolbx-images/rockylinux-toolbox:8", logo: RockyLinuxLogo },
    { name: "CentOS Stream 9", address: "quay.io/toolbx-images/centos-toolbox:stream9", logo: CentOSLogo },
    { name: "CentOS Stream 8", address: "quay.io/toolbx-images/centos-toolbox:stream8", logo: CentOSLogo },
  ]},
  { category: "Red Hat", images: [
    { name: "Red Hat UBI 9", address: "registry.access.redhat.com/ubi9/toolbox", logo: RedhatLogo },
    { name: "Red Hat UBI 8", address: "registry.access.redhat.com/ubi8/toolbox", logo: RedhatLogo },
  ]},
  { category: "Other Distributions", images: [
    { name: "openSUSE", address: "registry.opensuse.org/opensuse/distrobox:latest", logo: OpenSuseLogo },
    { name: "Alpine 3.22", address: "quay.io/toolbx-images/alpine-toolbox:3.22", logo: AlpineLogo },
    { name: "Alpine 3.21", address: "quay.io/toolbx-images/alpine-toolbox:3.21", logo: AlpineLogo },
    { name: "Wolfi", address: "quay.io/toolbx-images/wolfi-toolbox:latest", logo: WolfiLogo },
    { name: "Amazon Linux 2023", address: "quay.io/toolbx-images/amazonlinux-toolbox:2023", logo: AmazonLinuxLogo },
    { name: "Amazon Linux 2", address: "quay.io/toolbx-images/amazonlinux-toolbox:2", logo: AmazonLinuxLogo },
  ]},
  { category: "Ublue Variants", images: [
    { name: "Bluefin CLI", address: "ghcr.io/ublue-os/bluefin-cli:latest", logo: UblueLogo },
    { name: "Ublue Ubuntu", address: "ghcr.io/ublue-os/ubuntu-toolbox:latest", logo: UblueLogo },
    { name: "Ublue Fedora", address: "ghcr.io/ublue-os/fedora-toolbox:latest", logo: UblueLogo },
    { name: "Ublue Wolfi", address: "ghcr.io/ublue-os/wolfi-toolbox:latest", logo: UblueLogo },
    { name: "Ublue Arch", address: "ghcr.io/ublue-os/archlinux-distrobox:latest", logo: UblueLogo },
  ]},
];

// --- Main Component ---

const DownloadImages: React.FC = () => {
  const [customImageAddress, setCustomImageAddress] = useState('');
  const [selectedImageAddress, setSelectedImageAddress] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Pull process state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [pullLogs, setPullLogs] = useState<string[]>([]);
  const [pullError, setPullError] = useState<string | null>(null);
  const [pullSuccess, setPullSuccess] = useState(false);

  useEffect(() => {
    window.electronAPI.onImagePullLog((log) => {
      setPullLogs(prev => [...prev, log]);
    });
  }, []);
  
  const handleSelectImage = (image: ImageInfo) => {
    setCustomImageAddress(image.address);
    setSelectedImageAddress(image.address);
  };
  
  const handlePullImage = async () => {
    if (!customImageAddress) return;
    
    setIsModalOpen(true);
    setIsPulling(true);
    setPullLogs([]);
    setPullError(null);
    setPullSuccess(false);

    try {
        await window.electronAPI.imagePull(customImageAddress);
        setPullSuccess(true);
    } catch (err) {
        setPullError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
        setIsPulling(false);
    }
  };
  
  const filteredImageList = useMemo(() => {
    if (!searchQuery) return imageList;
    const lowerCaseQuery = searchQuery.toLowerCase();
    
    return imageList
      .map(category => ({
        ...category,
        images: category.images.filter(image => 
          image.name.toLowerCase().includes(lowerCaseQuery) ||
          category.category.toLowerCase().includes(lowerCaseQuery) ||
          image.address.toLowerCase().includes(lowerCaseQuery)
        )
      }))
      .filter(category => category.images.length > 0);
  }, [searchQuery]);

  return (
    <div className="container mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-100">Download Images</h1>
        <p className="text-gray-400 mt-1">Select a pre-configured image or enter a custom one to pull.</p>
      </header>

      <section className="bg-primary p-6 rounded-lg shadow-lg mb-8 sticky top-0 z-10">
          <label htmlFor="custom-image" className="block text-sm font-medium text-gray-300 mb-2">
            Custom Image Address
          </label>
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              id="custom-image"
              type="text"
              value={customImageAddress}
              onChange={(e) => {
                setCustomImageAddress(e.target.value);
                setSelectedImageAddress(null); // Deselect card if user types
              }}
              placeholder="e.g., quay.io/fedora/fedora-toolbox:42"
              className="flex-grow w-full px-4 py-2 bg-primary-light border border-primary rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
            <button
              onClick={handlePullImage}
              disabled={!customImageAddress || isPulling}
              className="px-8 py-2 bg-accent text-charcoal font-bold rounded-lg hover:bg-accent-light disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-200"
            >
              Pull Image
            </button>
          </div>
      </section>
      
      <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
          </div>
          <input
              type="search"
              placeholder="Filter distributions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-primary border border-primary-light rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
      </div>

      <main className="space-y-8">
        {filteredImageList.length > 0 ? filteredImageList.map(({ category, images }) => (
          <section key={category}>
            <h2 className="text-2xl font-semibold text-gray-300 mb-4 border-b-2 border-primary-light pb-2">{category}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <AnimatePresence>
              {images.map(image => (
                <motion.button
                  layout
                  key={image.address}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => handleSelectImage(image)}
                  className={`flex items-center p-4 text-left rounded-lg border-2 transition-all duration-200 w-full h-full transform hover:scale-105
                    ${selectedImageAddress === image.address ? 'bg-accent/20 border-accent' : 'bg-primary border-primary-light hover:border-gray-600'}
                  `}
                >
                  <image.logo className={`w-10 h-10 mr-4 flex-shrink-0 ${image.logo === GenericLogo ? 'text-gray-400' : ''}`} />
                  <div className="min-w-0">
                    <p className="font-bold text-gray-100">{image.name}</p>
                    <p className="text-xs text-gray-400 mt-1 truncate" title={image.address}>{image.address}</p>
                  </div>
                </motion.button>
              ))}
              </AnimatePresence>
            </div>
          </section>
        )) : (
          <div className="text-center py-10">
            <p className="text-gray-400 text-lg">No distributions match your search.</p>
            <p className="text-gray-500 mt-2">Try a different search term or pull a custom image above.</p>
          </div>
        )}
      </main>
      
      <PullModal
        isOpen={isModalOpen}
        logs={pullLogs}
        error={pullError}
        success={pullSuccess}
        isPulling={isPulling}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};

export default DownloadImages;
