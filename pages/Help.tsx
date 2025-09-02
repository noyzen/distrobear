import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MagnifyingGlassIcon, CubeIcon, PlusCircleIcon, Squares2X2Icon, ArchiveBoxIcon, ArrowDownTrayIcon, ExclamationTriangleIcon } from '../components/Icons';

interface HelpTopic {
    title: string;
    content: React.ReactNode;
}

interface HelpCategory {
    name: string;
    icon: React.ReactElement;
    topics: HelpTopic[];
}

const helpData: HelpCategory[] = [
    {
        name: "Getting Started",
        icon: <CubeIcon />,
        topics: [
            {
                title: "First Launch & Setup",
                content: (
                    <>
                        <p>Welcome to DistroBear! On your first launch, the app checks for its two main dependencies: <strong>Distrobox</strong> and a container runtime like <strong>Podman</strong>.</p>
                        <p>If either is missing, the Setup Wizard will appear. It can automatically install them for you. This may require your administrator (sudo) password, as it installs system-level software.</p>
                        <p>If you choose to skip, some features may not work. You can always re-run the wizard from the "System & Info" page.</p>
                    </>
                ),
            },
        ],
    },
    {
        name: "My Containers",
        icon: <CubeIcon />,
        topics: [
            {
                title: "Viewing Your Containers",
                content: <p>This is the main dashboard. It lists all Distrobox containers on your system, showing their name, base image, and current status (Running or Stopped). Use the refresh button to get the latest status.</p>,
            },
            {
                title: "Container Actions",
                content: (
                    <>
                        <p>Click on any container to expand its action panel:</p>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                            <li><strong>Start/Stop:</strong> Toggle the power state of the container.</li>
                            <li><strong>Enter:</strong> Opens a new terminal window with a shell inside the container. Your system's default terminal will be used.</li>
                            <li><strong>Info:</strong> Shows a detailed modal with technical information like PID, mounted volumes, and configuration flags.</li>
                            <li><strong>Autostart:</strong> (Requires Podman & systemd) If enabled, this container will start automatically when you log in.</li>
                            <li><strong>Save as Image:</strong> Creates a new local image from the container's current state. This is useful for backing up or sharing your configured environments.</li>
                            <li><strong>Delete:</strong> Permanently removes the container and all data inside it. This action cannot be undone.</li>
                        </ul>
                    </>
                ),
            },
        ],
    },
    {
        name: "Creating Containers",
        icon: <PlusCircleIcon />,
        topics: [
            {
                title: "Step 1: Select an Image",
                content: <p>Choose a base image for your new container from the list of images you have locally. If you don't see any, you'll need to download one from the "Download Images" page first.</p>,
            },
            {
                title: "Step 2: Configuration",
                content: (
                    <>
                        <p>Give your container a unique name. Then, configure advanced options:</p>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                            <li><strong>Isolated Home:</strong> Highly recommended. This creates a separate home directory for the container, preventing it from accessing your personal files on the host.</li>
                            <li><strong>Enable Init:</strong> Allows services like <code>systemd</code> to run inside. Useful for complex setups but uses more resources.</li>
                            <li><strong>NVIDIA GPU Access:</strong> Gives the container access to your NVIDIA GPU, essential for gaming or AI/ML work.</li>
                            <li><strong>Volumes:</strong> Mount specific folders from your host system into the container. Provide the absolute path on the host and the desired absolute path inside the container.</li>
                        </ul>
                    </>
                ),
            },
        ],
    },
    {
        name: "Applications",
        icon: <Squares2X2Icon />,
        topics: [
            {
                title: "Finding & Sharing Apps",
                content: (
                    <>
                        <p>This page scans your <strong>running</strong> containers for installed graphical applications (<code>.desktop</code> files).</p>
                        <p>Click the <strong>Share</strong> button to "export" an application. This creates a launcher in your host system's application menu. When you click it, the app will launch from within its container seamlessly.</p>
                        <p>If a container is stopped, its applications won't appear in the list. Use the filters to select a stopped container, and the app will prompt you to start it before scanning.</p>
                    </>
                ),
            },
        ],
    },
    {
        name: "Image Management",
        icon: <ArchiveBoxIcon />,
        topics: [
            {
                title: "Local Images",
                content: <p>This page lists all container images on your system. You can see their name, tag, size, and when they were created. From here, you can export them to a file or delete them to save space.</p>,
            },
            {
                title: "Download Images",
                content: <p>Browse a curated list of popular and recommended images for Distrobox. Select one or enter a custom address (e.g., from Docker Hub or Quay.io) to download it.</p>,
            },
            {
                title: "Import/Export",
                content: <p>You can export any local image to a <code>.tar</code> archive file. This is a great way to back up images or share them with others. You can then import these <code>.tar</code> files on any machine with Podman/Docker.</p>,
            },
        ],
    },
    {
        name: "Troubleshooting",
        icon: <ExclamationTriangleIcon />,
        topics: [
            {
                title: "Commands Failing",
                content: <p>If you see errors about commands not being found, ensure Distrobox and Podman are correctly installed and in your system's PATH. The Setup Wizard can help fix this. Check the "Logs" page for detailed error messages.</p>,
            },
            {
                title: "Applications Not Showing Up",
                content: <p>First, make sure the container with the application is <strong>running</strong>. Second, ensure the application is a graphical one with a proper <code>.desktop</code> file in standard system locations (like <code>/usr/share/applications</code>).</p>,
            },
            {
                title: "Interpreting Logs",
                content: <p>The "Logs" page provides a detailed view of the commands DistroBear runs. Errors are highlighted in red. This is the best place to look for clues when something goes wrong. You can copy the logs to share them when asking for help.</p>,
            },
        ],
    }
];

const Help: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState(helpData[0].name);

    const filteredHelpData = useMemo(() => {
        if (!searchQuery) return helpData;
        const lowerQuery = searchQuery.toLowerCase();

        return helpData
            .map(category => ({
                ...category,
                topics: category.topics.filter(
                    topic => topic.title.toLowerCase().includes(lowerQuery) || (typeof topic.content === 'string' && topic.content.toLowerCase().includes(lowerQuery))
                ),
            }))
            .filter(category => category.name.toLowerCase().includes(lowerQuery) || category.topics.length > 0);
    }, [searchQuery]);
    
    const displayedCategories = searchQuery ? filteredHelpData : helpData;

    return (
        <div className="container mx-auto">
            <header className="mb-6 text-center">
                <h1 className="text-3xl font-bold text-gray-100">Help & Documentation</h1>
                <div className="relative mt-4 max-w-lg mx-auto">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
                    </div>
                    <input type="search" placeholder="Search topics..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-primary border border-primary-light rounded-full text-gray-200 focus:outline-none focus:ring-2 focus:ring-accent/50"/>
                </div>
            </header>

            <div className="flex flex-col md:flex-row gap-8">
                <aside className="md:w-1/4">
                    <nav className="space-y-2 sticky top-8">
                        {displayedCategories.map(cat => (
                             <button key={cat.name} onClick={() => setActiveCategory(cat.name)}
                                className={`w-full flex items-center gap-3 p-3 text-left rounded-lg transition-colors duration-200
                                ${activeCategory === cat.name && !searchQuery ? 'bg-accent/20 text-accent' : 'text-gray-300 hover:bg-primary-light'}`}>
                                <span className="w-6 h-6 flex-shrink-0">{cat.icon}</span>
                                <span className="font-semibold">{cat.name}</span>
                            </button>
                        ))}
                    </nav>
                </aside>

                <main className="md:w-3/4 bg-primary p-6 rounded-lg">
                    <AnimatePresence mode="wait">
                    {displayedCategories.map(cat => (
                        (activeCategory === cat.name || searchQuery) && (
                            <motion.section 
                                key={cat.name}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-6"
                            >
                                <h2 className="text-2xl font-bold text-gray-100 border-b-2 border-primary-light pb-2">{cat.name}</h2>
                                {cat.topics.map(topic => (
                                    <article key={topic.title}>
                                        <h3 className="text-lg font-semibold text-accent mb-2">{topic.title}</h3>
                                        <div className="text-gray-300 space-y-2 prose prose-invert prose-p:text-gray-300 prose-strong:text-gray-200">
                                            {topic.content}
                                        </div>
                                    </article>
                                ))}
                            </motion.section>
                        )
                    ))}
                     {filteredHelpData.length === 0 && searchQuery && (
                        <div className="text-center py-10">
                            <p className="text-gray-400 text-lg">No help topics match your search.</p>
                            <p className="text-gray-500 mt-2">Try a different search term.</p>
                        </div>
                     )}
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
};

export default Help;
