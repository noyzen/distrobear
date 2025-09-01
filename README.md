# DistroBear 🐻

A friendly desktop GUI to manage your [distrobox](https://distrobox.it/) containers.

DistroBear simplifies the management of `distrobox` containers by providing an intuitive graphical interface. It's perfect for both new users who are just getting started with `distrobox` and experienced users who want a quicker, more visual way to interact with their containers.

---

## ✨ Key Features

-   **Container Management**: Easily view, start, stop, and delete your containers.
-   **Detailed Insights**: Inspect containers to see detailed information like resource usage, mounted volumes, and configuration flags.
-   **Effortless Creation**: A step-by-step wizard to create new containers with advanced options like isolated home directories, `init` support, NVIDIA GPU access, and custom volume mounts.
-   **Image Management**:
    -   List all your local container images.
    -   Save a running container's state as a new image (commit).
    -   Import/Export images as `.tar` files.
    -   Delete unwanted images to free up space.
-   **Discover & Download**: Browse a curated list of popular `distrobox`-compatible images and download them with a single click.
-   **Application Integration**: Discover graphical applications within your containers and seamlessly "export" them to your host's application menu.
-   **System Setup Wizard**: First-time users are guided through an automated installation of `distrobox` and `podman`.
-   **System Information**: A dedicated panel to view system details and versions of your core dependencies.

---

## 📸 Screenshots

*(Add screenshots of the main application windows here)*

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
