import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MagnifyingGlassIcon, CubeIcon, PlusCircleIcon, Squares2X2Icon, ArchiveBoxIcon, ExclamationTriangleIcon } from '../components/Icons';

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
                title: "What is DistroBear?",
                content: (
                    <>
                        <p>Welcome to DistroBear! This application is a graphical user interface (GUI) for <strong>Distrobox</strong>, a powerful command-line tool that lets you create and manage containerized development and testing environments.</p>
                        <p>Essentially, you can run almost any Linux distribution inside a container on your host system, and its applications will be tightly integrated with your desktop. DistroBear makes this entire process visual and easy to manage.</p>
                    </>
                ),
            },
            {
                title: "First Launch & Setup",
                content: (
                    <>
                        <p>On your first launch, the app checks for its two main dependencies: <strong>Distrobox</strong> itself, and a container runtime like <strong>Podman</strong>. Podman is the engine that actually runs the containers.</p>
                        <p>If either is missing, the Setup Wizard will appear. It can automatically install them using your system's package manager. This process requires administrator (sudo) privileges because it's installing system-level software.</p>
                        <p>If the automatic installation fails, you may need to install them manually. For most distributions, you can find them in your software center or install them from a terminal (e.g., <code>sudo apt install podman</code> on Debian/Ubuntu or <code>sudo dnf install podman</code> on Fedora).</p>
                        <p>If you choose to skip the setup, some features may not work. You can always re-run the wizard at any time from the "System & Info" page.</p>
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
                title: "The Main Dashboard",
                content: <p>This page is your central hub. It lists all Distrobox containers on your system, showing their name, the base image they were created from, and their current status (e.g., "Up", "Exited"). Use the refresh button in the top right to poll for the latest status of all containers.</p>,
            },
            {
                title: "Container Actions Explained",
                content: (
                    <>
                        <p>Click on any container in the list to expand its action panel. Here's what each action does:</p>
                        <ul className="list-disc list-inside mt-2 space-y-2">
                            <li><strong>Start/Stop:</strong> Toggles the power state of the container. A container must be running to enter it or use its applications.</li>
                            <li><strong>Enter:</strong> This is one of the most common actions. It opens a new terminal window with a shell inside the container. DistroBear will attempt to detect and use your system's default terminal emulator.</li>
                            <li><strong>Info:</strong> Opens a detailed modal with technical information like the container's unique ID, process ID (PID), all mounted volumes, and configuration flags like NVIDIA or Init support.</li>
                            <li><strong>Autostart:</strong> This feature requires <strong>Podman</strong> and a <strong>systemd</strong>-based host OS. When enabled, DistroBear creates a systemd user service that automatically starts the container when you log into your desktop.</li>
                            <li><strong>Save as Image:</strong> Takes a snapshot of the container's current state and saves it as a new, permanent local image. This is incredibly useful for backing up a configured environment or creating a custom "template" to spawn new containers from. It uses the <code>podman commit</code> command in the background.</li>
                            <li><strong>Delete:</strong> This permanently removes the container and all data inside it. If you are using an isolated home, that directory will also be deleted. This action cannot be undone, so use it with caution.</li>
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
                title: "Step 1: Select a Base Image",
                content: <p>To create a container, you must first have a base image. This page lists all the container images you have downloaded to your local machine. If this list is empty, go to the "Download Images" page to pull one first.</p>,
            },
            {
                title: "Step 2: Core & Advanced Configuration",
                content: (
                    <>
                        <p>After selecting an image, you need to give your container a unique name. You can then configure several powerful options:</p>
                        <ul className="list-disc list-inside mt-2 space-y-2">
                            <li><strong>Isolated Home:</strong> <span className="text-accent font-semibold">Highly Recommended.</span> This creates a separate, dedicated home directory for the container inside <code>~/.local/share/distrobox/homes/</code>. It prevents the container from accessing your personal files on the host, providing a significant security and organization boost. If you don't use this, the container will have full access to your host's <code>$HOME</code> directory.</li>
                            <li><strong>Enable Init:</strong> Injects an init system (like <code>systemd</code>) as PID 1 inside the container. This is necessary for running background services or applications that expect a full system environment (e.g., Docker, some system daemons). Note that this consumes slightly more resources.</li>
                            <li><strong>NVIDIA GPU Access:</strong> If you have a host with NVIDIA drivers, this option will pass the GPU through to the container. This is essential for GPU-accelerated tasks like gaming, video editing, or AI/ML development.</li>
                            <li><strong>Volumes:</strong> Mount additional, specific directories from your host into the container. For example, you could mount your host's <code>~/Projects</code> directory to <code>/home/user/Projects</code> inside the container. This allows you to edit code with an IDE on your host while compiling and running it inside the container's sandboxed environment.</li>
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
                        <p>This page scans your <strong>running</strong> containers for installed graphical applications (specifically, valid <code>.desktop</code> files).</p>
                        <p>Click the <strong>Share</strong> button to "export" an application. This tells Distrobox to create a special launcher file in your host system's application menu. When you click this launcher (e.g., from your GNOME or KDE menu), the app will launch from within its container seamlessly, feeling just like a native application.</p>
                        <p>If a container is stopped, its applications won't appear in the list. You can use the "Filter by Container" dropdown to select a stopped container; the app will then prompt you to start it before it can be scanned.</p>
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
                title: "Local Images vs. Containers",
                content: <p>It's helpful to understand the difference: An <strong>Image</strong> is a read-only template or blueprint (like an ISO for a virtual machine). A <strong>Container</strong> is a running instance created from an image. You can have many containers based on a single image. The "Local Images" page manages the templates, while "My Containers" manages the running instances.</p>,
            },
            {
                title: "Download Images",
                content: <p>Browse a curated list of popular and recommended images for Distrobox. Select one from the list or enter a custom image address (e.g., from Docker Hub, Quay.io, or ghcr.io) into the top bar to download it to your local machine.</p>,
            },
            {
                title: "Import/Export Images",
                content: <p>You can export any local image to a single <code>.tar</code> archive file. This is a great way to back up your custom images or share them with colleagues. You can then import these <code>.tar</code> files on any other machine that has Podman or Docker, and it will be added to their list of local images.</p>,
            },
        ],
    },
    {
        name: "Troubleshooting",
        icon: <ExclamationTriangleIcon />,
        topics: [
            {
                title: "Commands Are Failing or Errors Appear",
                content: <p>If you see errors about "command not found" or other unexpected failures, the first place to check is the <strong>Logs</strong> page. It provides a detailed, real-time view of the shell commands DistroBear runs in the background, including their output. Errors are highlighted in red. This is the best place to look for clues when something goes wrong. You can copy the logs to share them when asking for help.</p>,
            },
            {
                title: "Applications Not Showing Up in the List",
                content: <p>There are a few reasons this could happen:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>The container holding the application must be <strong>running</strong>.</li>
                        <li>The application needs a proper <code>.desktop</code> file in a standard system location (like <code>/usr/share/applications</code>). Command-line-only tools will not appear here.</li>
                        <li>The application might be marked as hidden (<code>NoDisplay=true</code> in its .desktop file).</li>
                        <li>Try clicking the "Refresh" button on the Applications page to force a re-scan.</li>
                    </ul>
                </p>,
            },
             {
                title: "Shared App Doesn't Launch",
                content: <p>If a shared app icon appears in your menu but doesn't launch, try running it from a terminal inside the container first. Use the <strong>Enter</strong> action, and in the new terminal, type the command to launch your app (e.g., <code>firefox</code>). This will often show you error messages, such as missing dependencies, that are hidden when launched graphically.</p>,
            },
            {
                title: "Where is my data stored?",
                content: (
                    <>
                        <p>Your data is stored in standard locations in your home directory:</p>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                            <li><strong>Container Storage (Podman):</strong> <code>~/.local/share/containers/storage</code></li>
                            <li><strong>Isolated Home Directories:</strong> <code>~/.local/share/distrobox/homes/</code></li>
                            <li><strong>Shared Application Launchers:</strong> <code>~/.local/share/applications/</code></li>
                        </ul>
                    </>
                )
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
                    topic => topic.title.toLowerCase().includes(lowerQuery)
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
                    {/* FIX: The value prop was incorrectly assigned a function. Moved to onChange and set value to state. */}
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
                                        <div className="text-gray-300 space-y-3 prose prose-invert prose-p:text-gray-300 prose-strong:text-gray-200 prose-code:text-accent/80 prose-code:bg-primary-light prose-code:p-1 prose-code:rounded-md prose-code:font-mono">
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