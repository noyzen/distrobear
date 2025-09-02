import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MagnifyingGlassIcon, CubeIcon, PlusCircleIcon, Squares2X2Icon, ArchiveBoxIcon, ExclamationTriangleIcon, CommandLineIcon } from '../components/Icons';

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
        name: "Introduction & Concepts",
        icon: <CubeIcon />,
        topics: [
            {
                title: "What is DistroBear?",
                content: (
                    <>
                        <p>DistroBear is a graphical user interface (GUI) for <strong>Distrobox</strong>. It takes the powerful command-line features of Distrobox and presents them in an intuitive, visual way.</p>
                        <p>Our goal is to make managing your development and testing environments easy, fast, and accessible to everyone, from beginners to power users, without needing to memorize commands.</p>
                    </>
                ),
            },
            {
                title: "Core Concepts: Containers, Images, and Runtimes",
                content: (
                    <>
                        <p>To understand DistroBear and Distrobox, it's helpful to know three key terms:</p>
                        <ul className="list-disc list-inside mt-2 space-y-3">
                            <li><strong>Image:</strong> An image is a read-only blueprint or template. It contains a complete Linux operating system (like Ubuntu 22.04 or Fedora 40), including all the files, libraries, and tools. You download images from online registries.</li>
                            <li><strong>Container:</strong> A container is a live, running instance created from an image. Think of it as a lightweight virtual machine. You can start it, stop it, install software inside it, and then delete it when you're done. The changes you make inside a container do not affect the original image.</li>
                            <li><strong>Runtime:</strong> The runtime is the engine that actually builds, runs, and manages your containers. DistroBear uses <strong>Podman</strong> as its recommended runtime. It's the low-level tool that does the heavy lifting.</li>
                        </ul>
                    </>
                ),
            },
            {
                title: "What is Distrobox?",
                content: (
                    <>
                        <p>Distrobox is a tool that makes it easy to create and manage containers, but with a special focus on deep integration with your host operating system. It sets up containers in a way that allows them to share your home directory, USB devices, graphical applications, and more.</p>
                        <p>This tight integration is its superpower. An application running inside a Distrobox container can look and feel exactly like a native app on your host system. Distrobox handles all the complex networking and permissions to make this possible.</p>
                    </>
                ),
            },
            {
                title: "What is Podman?",
                content: (
                    <>
                        <p>Podman is the container runtime engine that Distrobox uses to do its work. It is a powerful, modern tool for managing containers and images. One of its key features is its <strong>daemonless</strong> architecture.</p>
                        <p>Unlike Docker, which requires a constantly running background service (a daemon), Podman runs directly as a user process. This is generally considered more secure and lightweight, making it an excellent choice for desktop use.</p>
                    </>
                ),
            },
        ],
    },
    {
        name: "Getting Started",
        icon: <CubeIcon />,
        topics: [
            {
                title: "First Launch & Automated Setup",
                content: (
                    <>
                        <p>On your first launch, DistroBear checks for its two main dependencies: <strong>Distrobox</strong> and <strong>Podman</strong>.</p>
                        <p>If either is missing, the Setup Wizard will appear. It can automatically install them using your system's package manager (like <code>apt</code>, <code>dnf</code>, or <code>pacman</code>). This process requires administrator (sudo) privileges because it's installing system-level software.</p>
                        <p>If you choose to skip the setup, some features may not work. You can always re-run the wizard at any time from the "System & Info" page.</p>
                    </>
                ),
            },
        ],
    },
    {
        name: "Managing Containers",
        icon: <CubeIcon />,
        topics: [
            {
                title: "The Container Dashboard",
                content: <p>The "My Containers" page lists all Distrobox containers on your system. It shows their name, base image, and current status. A pulsing green circle means 'Running', while a hollow grey circle means 'Stopped'. You can also see icons indicating if a container has an <strong>Isolated Home</strong> (a shield) or is set to <strong>Autostart</strong> (a lightning bolt).</p>,
            },
            {
                title: "Container Actions Explained",
                content: (
                    <>
                        <p>Click on any container to expand its action panel. Here's what each action does:</p>
                        <ul className="list-disc list-inside mt-2 space-y-2">
                            <li><strong>Start/Stop:</strong> Toggles the power state of the container. A container must be running to enter it or use its applications. DistroBear uses the command <code>distrobox enter [name] -- /bin/true</code> to reliably start containers and <code>distrobox stop --yes [name]</code> to stop them.</li>
                            <li><strong>Enter:</strong> Opens a new terminal window with a shell inside the container. This action will automatically start the container if it's stopped. DistroBear attempts to detect your system's default terminal.</li>
                            <li><strong>Info:</strong> Opens a modal with technical details like the container ID, mounted volumes, and configuration flags. This information is gathered using <code>podman inspect [name]</code>.</li>
                            <li><strong>Autostart:</strong> Requires <strong>Podman</strong> and a <strong>systemd</strong>-based host. It creates a systemd user service that automatically starts the container on login. This uses <code>podman generate systemd</code> and <code>systemctl --user enable</code>.</li>
                            <li><strong>Save as Image:</strong> Takes a snapshot of the container's current state and saves it as a new local image. This is useful for backing up a configured environment. It uses the <code>podman commit [name] [new-image-name]</code> command.</li>
                            <li><strong>Delete:</strong> Permanently removes the container and all its data. This cannot be undone. It uses <code>distrobox rm --yes [name]</code>.</li>
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
                content: <p>To create a container, you must first have a base image. This page lists all the container images you have downloaded to your machine. If this list is empty, go to the "Download Images" page to pull one first. The command used for creation is <code>distrobox-create</code>.</p>,
            },
            {
                title: "Step 2: Configuration Options",
                content: (
                    <>
                        <p>After selecting an image, you must give your container a unique name and can then configure several powerful options:</p>
                        <ul className="list-disc list-inside mt-2 space-y-2">
                            <li><strong>Isolated Home:</strong> <span className="text-accent font-semibold">Highly Recommended.</span> Creates a separate home directory for the container inside <code>~/.local/share/distrobox/homes/</code>. This prevents the container from accessing your host's personal files, a major security benefit. Corresponds to the <code>--home</code> flag.</li>
                            <li><strong>Enable Init:</strong> Injects an init system (like <code>systemd</code>). This is necessary for running services like Docker inside the container. Corresponds to the <code>--init</code> flag.</li>
                            <li><strong>NVIDIA GPU Access:</strong> If you have NVIDIA drivers, this passes the GPU through to the container. Essential for GPU-accelerated tasks. Corresponds to the <code>--nvidia</code> flag.</li>
                            <li><strong>Volumes:</strong> Mount additional directories from your host into the container. For example, mount host <code>~/Projects</code> to container <code>/home/user/Projects</code>. Corresponds to the <code>--volume host:container</code> flag.</li>
                        </ul>
                    </>
                ),
            },
        ],
    },
    {
        name: "Managing Applications",
        icon: <Squares2X2Icon />,
        topics: [
            {
                title: "How Application Discovery Works",
                content: <p>This page scans your <strong>running</strong> containers for installed graphical applications (specifically, valid <code>.desktop</code> files in standard locations like <code>/usr/share/applications</code>). If a container is stopped, its apps won't appear.</p>,
            },
            {
                title: "Sharing & Unsharing Applications",
                content: (
                    <>
                        <p>Clicking <strong>Share</strong> uses the <code>distrobox-export --app [app-name]</code> command. This creates a special launcher file in your host system's application menu (usually at <code>~/.local/share/applications/</code>). When you click this launcher, the app starts seamlessly from its container.</p>
                        <p><strong>Unshare</strong> reverses this process using the <code>--delete</code> flag.</p>
                    </>
                ),
            },
        ],
    },
    {
        name: "Managing Images",
        icon: <ArchiveBoxIcon />,
        topics: [
            {
                title: "Download Images",
                content: <p>You can browse a curated list of popular images or enter a custom address from a public registry (like <code>docker.io/library/ubuntu</code> or <code>quay.io/fedora/fedora-toolbox:40</code>). This uses the <code>podman pull [address]</code> command.</p>,
            },
            {
                title: "Local Images",
                content: <p>This page lists all images on your machine using <code>podman images</code>. From here you can delete an image (<code>podman rmi [image]</code>) or export it.</p>
            },
            {
                title: "Import/Export Images",
                content: <p>You can export any local image to a single <code>.tar</code> archive file using <code>podman save</code>. This is great for backups or sharing. You can then import these <code>.tar</code> files on another machine using <code>podman load</code>.</p>,
            },
        ],
    },
    {
        name: "Key Commands Reference",
        icon: <CommandLineIcon />,
        topics: [
            {
                title: "Common Distrobox Commands",
                content: (
                    <pre className="text-xs">
                        <code># List all your distrobox containers{"\n"}distrobox-list{"\n\n"}
# Create a new Fedora container{"\n"}distrobox-create --name my-fedora --image quay.io/fedora/fedora-toolbox:40{"\n\n"}
# Enter a running container{"\n"}distrobox-enter my-fedora{"\n\n"}
# Run a command inside a container without entering{"\n"}distrobox-enter my-fedora -- sudo dnf update{"\n\n"}
# Stop a running container{"\n"}distrobox-stop my-fedora{"\n\n"}
# Remove a container permanently{"\n"}distrobox-rm my-fedora</code>
                    </pre>
                ),
            },
            {
                title: "Common Podman Commands",
                content: (
                     <pre className="text-xs">
                        <code># List all containers (including non-distrobox){"\n"}podman ps -a{"\n\n"}
# List all local images{"\n"}podman images{"\n\n"}
# Pull a new image from a registry{"\n"}podman pull docker.io/library/alpine{"\n\n"}
# Remove a local image{"\n"}podman rmi docker.io/library/alpine{"\n\n"}
# View the logs of a container{"\n"}podman logs my-fedora{"\n\n"}
# See resource usage for running containers{"\n"}podman stats</code>
                    </pre>
                ),
            },
        ]
    },
    {
        name: "Troubleshooting",
        icon: <ExclamationTriangleIcon />,
        topics: [
            {
                title: "Commands Are Failing or Errors Appear",
                content: <p>The first place to check is the <strong>Logs</strong> page in DistroBear. It provides a detailed, real-time view of the shell commands the app runs and their output. Errors are highlighted in red. This is the best place to look for clues when something goes wrong.</p>,
            },
            {
                title: "Applications Not Showing Up",
                content: (
                    <>
                    <p>There are a few reasons this could happen:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>The container holding the application must be <strong>running</strong>.</li>
                        <li>The application needs a proper <code>.desktop</code> file. Command-line-only tools will not appear.</li>
                        <li>The application might be marked as hidden (<code>NoDisplay=true</code> in its .desktop file).</li>
                        <li>Try clicking the "Refresh" button on the Applications page to force a re-scan.</li>
                    </ul>
                    </>
                ),
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
                    topic => topic.title.toLowerCase().includes(lowerQuery) || (
                        // A simple way to search content without complex parsing
                        JSON.stringify(topic.content).toLowerCase().includes(lowerQuery)
                    )
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
                                        <div className="text-gray-300 space-y-3 prose prose-invert prose-p:text-gray-300 prose-strong:text-gray-200 prose-code:text-accent/80 prose-code:bg-primary-light prose-code:p-1 prose-code:rounded-md prose-code:font-mono prose-a:text-accent/90 hover:prose-a:text-accent">
                                            {topic.content}
                                        </div>
                                    </article>
                                ))}
                                {cat.topics.length === 0 && searchQuery && (
                                     <p className="text-gray-500">No topics in this category match your search.</p>
                                )}
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
