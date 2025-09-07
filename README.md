# DistroBear 🐻

![DistroBear Screenshot](https://i.imgur.com/mctlVJK.jpeg)

A friendly desktop GUI to manage your [distrobox](https://distrobox.it/) containers.

DistroBear simplifies the management of `distrobox` containers by providing an intuitive graphical interface. It's perfect for both new users who are just getting started with `distrobox` and experienced users who want a quicker, more visual way to interact with their containers.



---

## ✨ Key Features

-   📦 **Intuitive Container Management**: View, start, stop, delete, and enter your containers with a single click.
-   ⚙️ **Detailed Container Insights**: Instantly access detailed information, including mounted volumes, resource usage, and configuration flags.
-   ✨ **Effortless Creation Wizard**: A guided, step-by-step process to create new containers with advanced options:
    -   🔒 **Isolated Home Directories**: Enhance security by keeping container home directories separate from your host.
    -   🚀 **Init/Systemd Support**: Run complex services and daemons inside your containers.
    -   🎮 **NVIDIA GPU Passthrough**: Grant containers access to your NVIDIA GPU for accelerated tasks.
    -   📁 **Custom Volume Mounts**: Easily share specific project folders between your host and containers.
-   🖼️ **Comprehensive Image Management**:
    -   List, search, and manage all your local container images.
    -   Download new images from a curated list or any public registry.
    -   Save a configured container's state as a new custom image (commit).
    -   Backup and share your images by exporting/importing them as `.tar` files.
-   🖥️ **Seamless Application Integration**:
    -   Automatically discover graphical applications inside your running containers.
    -   "Share" (export) applications to your host's main menu, making them feel like native apps.
-   🔧 **Automated Setup Wizard**: First-time users are guided through an automatic installation of `distrobox` and `podman`.
-   📊 **System Dashboard**: View key system information, dependency versions, and manage your setup.
-   📜 **Live Logging & Help**: An integrated logging view for easy troubleshooting and a comprehensive help section to answer common questions.

---

## 🚀 Installation

The easiest way to get started is by downloading the latest `AppImage` from the [GitHub Releases](https://github.com/noyzen/distrobear/releases) page.

### Prerequisites

-   A modern Linux distribution.
-   `podman` is the recommended container runtime. The setup wizard can help install it.
-   `systemd` is required for the container autostart feature.

### Running the AppImage

1.  Make the AppImage executable:
    ```bash
    chmod +x DistroBear-*.AppImage
    ```

2.  Run the application:
    ```bash
    ./DistroBear-*.AppImage
    ```

On the first launch, DistroBear will check for `distrobox` and `podman`. If they are not found, a setup wizard will guide you through the installation process.

---

## 💻 For Developers

Interested in contributing or running the app from the source? Here's how:

### Prerequisites

-   [Node.js](https://nodejs.org/) (v18 or later)
-   `npm` or `yarn`

### Setup

1.  Clone the repository:
    ```bash
    git clone https://github.com/noyzen/distrobear.git
    cd distrobear
    ```

2.  Install the dependencies:
    ```bash
    npm install
    ```

### Running in Development Mode

This command will start the Vite development server for the React frontend and launch the Electron application, which will automatically reload on changes.

```bash
npm run electron:dev
```

### Building the Application

To build a distributable `AppImage` for your system, run:

```bash
npm run electron:build
```

The output will be located in the `release/` directory.

---

## 🙏 Acknowledgements

-   This project would not be possible without the incredible **[distrobox](https://github.com/89luca89/distrobox)** project.
-   Created by **[noyzen](https://github.com/noyzen)**.
-   Built with Electron, React, Vite, and Tailwind CSS.

---

## 📜 License

This project is licensed under the MIT License. See the `LICENSE` file for details.