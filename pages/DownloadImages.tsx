import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DistroIcon from '../components/DistroLogo';
import PullModal from '../components/download-images/PullModal';
import { ArrowDownTrayIcon, MagnifyingGlassIcon } from '../components/Icons';

// --- Animation Variants ---
const gridItemVariants = {
  hidden: { scale: 0.9, opacity: 0 },
  visible: { scale: 1, opacity: 1 }
};

// --- Data ---
interface ImageInfo {
  name: string;
  address: string;
}

interface ImageCategory {
  category: string;
  images: ImageInfo[];
}

const imageList: ImageCategory[] = [
  { category: "Fedora", images: [
    { name: "Fedora 42", address: "quay.io/fedora/fedora-toolbox:42" },
    { name: "Fedora 41", address: "quay.io/fedora/fedora-toolbox:41" },
    { name: "Fedora 40", address: "registry.fedoraproject.org/fedora-toolbox:40" },
    { name: "Fedora 39", address: "registry.fedoraproject.org/fedora-toolbox:39" },
  ]},
  { category: "Ubuntu", images: [
    { name: "Ubuntu 25.04", address: "quay.io/toolbx/ubuntu-toolbox:25.04" },
    { name: "Ubuntu 24.04", address: "quay.io/toolbx/ubuntu-toolbox:24.04" },
    { name: "Ubuntu 22.04", address: "quay.io/toolbx/ubuntu-toolbox:22.04" },
    { name: "Ubuntu 20.04", address: "quay.io/toolbx/ubuntu-toolbox:20.04" },
  ]},
  { category: "Debian", images: [
    { name: "Debian 13 (Trixie)", address: "quay.io/toolbx-images/debian-toolbox:13" },
    { name: "Debian 12 (Bookworm)", address: "quay.io/toolbx-images/debian-toolbox:12" },
    { name: "Debian 11 (Bullseye)", address: "quay.io/toolbx-images/debian-toolbox:11" },
  ]},
  { category: "Arch Linux", images: [
    { name: "Arch Linux", address: "quay.io/toolbx/arch-toolbox:latest" },
    { name: "Bazzite (Arch)", address: "ghcr.io/ublue-os/bazzite-arch:latest" },
  ]},
  { category: "Enterprise Linux", images: [
    { name: "AlmaLinux 9", address: "quay.io/toolbx-images/almalinux-toolbox:9" },
    { name: "AlmaLinux 8", address: "quay.io/toolbx-images/almalinux-toolbox:8" },
    { name: "Rocky Linux 9", address: "quay.io/toolbx-images/rockylinux-toolbox:9" },
    { name: "Rocky Linux 8", address: "quay.io/toolbx-images/rockylinux-toolbox:8" },
    { name: "CentOS Stream 9", address: "quay.io/toolbx-images/centos-toolbox:stream9" },
    { name: "CentOS Stream 8", address: "quay.io/toolbx-images/centos-toolbox:stream8" },
  ]},
  { category: "Red Hat", images: [
    { name: "Red Hat UBI 9", address: "registry.access.redhat.com/ubi9/toolbox" },
    { name: "Red Hat UBI 8", address: "registry.access.redhat.com/ubi8/toolbox" },
  ]},
  { category: "Other Distributions", images: [
    { name: "openSUSE", address: "registry.opensuse.org/opensuse/distrobox:latest" },
    { name: "Alpine 3.22", address: "quay.io/toolbx-images/alpine-toolbox:3.22" },
    { name: "Alpine 3.21", address: "quay.io/toolbx-images/alpine-toolbox:3.21" },
    { name: "Wolfi", address: "quay.io/toolbx-images/wolfi-toolbox:latest" },
    { name: "Amazon Linux 2023", address: "quay.io/toolbx-images/amazonlinux-toolbox:2023" },
    { name: "Amazon Linux 2", address: "quay.io/toolbx-images/amazonlinux-toolbox:2" },
  ]},
  { category: "Ublue Variants", images: [
    { name: "Bluefin CLI", address: "ghcr.io/ublue-os/bluefin-cli:latest" },
    { name: "Ublue Ubuntu", address: "ghcr.io/ublue-os/ubuntu-toolbox:latest" },
    { name: "Ublue Fedora", address: "ghcr.io/ublue-os/fedora-toolbox:latest" },
    { name: "Ublue Wolfi", address: "ghcr.io/ublue-os/wolfi-toolbox:latest" },
    { name: "Ublue Arch", address: "ghcr.io/ublue-os/archlinux-distrobox:latest" },
  ]},
];

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
  
  const handleCancelPull = async () => {
      await window.electronAPI.imagePullCancel();
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
          <div className="flex gap-4">
            <input
              id="custom-image"
              type="text"
              value={customImageAddress}
              onChange={(e) => {
                setCustomImageAddress(e.target.value);
                setSelectedImageAddress(null); // Deselect card if user types
              }}
              placeholder="Enter custom image address to download..."
              className="flex-grow w-full px-4 py-2 bg-primary-light border border-primary rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handlePullImage}
              disabled={!customImageAddress || isPulling}
              className="flex-shrink-0 flex items-center justify-center gap-2 px-6 py-2 bg-accent text-white font-bold rounded-lg hover:bg-accent-light disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-200"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
              Download
            </motion.button>
          </div>
      </section>
      
      <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
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
          <motion.section 
            key={category}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-2xl font-semibold text-gray-300 mb-4 border-b-2 border-primary-light pb-2">{category}</h2>
            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
              initial="hidden"
              animate="visible"
            >
              <AnimatePresence>
              {images.map(image => (
                <motion.button
                  layout
                  key={image.address}
                  variants={gridItemVariants}
                  onClick={() => handleSelectImage(image)}
                  className={`flex items-center p-4 text-left rounded-lg border-2 transition-all duration-200 w-full h-full transform hover:scale-105
                    ${selectedImageAddress === image.address ? 'bg-accent/20 border-accent' : 'bg-primary border-primary-light hover:border-gray-600'}
                  `}
                >
                  <DistroIcon identifier={image.address} className="w-10 h-10 mr-4 flex-shrink-0" title={image.name} />
                  <div className="min-w-0">
                    <p className="font-bold text-gray-100">{image.name}</p>
                    <p className="text-xs text-gray-400 mt-1 truncate" title={image.address}>{image.address}</p>
                  </div>
                </motion.button>
              ))}
              </AnimatePresence>
            </motion.div>
          </motion.section>
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
        onCancel={handleCancelPull}
      />
    </div>
  );
};

export default DownloadImages;