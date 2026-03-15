# Nook - Disk Space Analyzer

A lightweight desktop utility for macOS that helps users quickly see what is taking up space on their computer and clean it easily.

## Features

- **Fast Scanning**: Quickly analyze disk usage with parallel processing
- **Visual Interface**: Clear visual map of storage usage with charts and graphs
- **Large File Detection**: Instantly identify the largest files and directories
- **File Type Analysis**: See which file types are consuming the most space
- **Safe Deletion**: Built-in safety checks to prevent accidental deletion of system files
- **Freemium Model**: Free scanning with premium features for file deletion and advanced tools

## Architecture

- **Backend**: Rust with Tauri for filesystem operations and system access
- **Frontend**: React with TypeScript for the user interface
- **Styling**: TailwindCSS for modern, responsive design
- **State Management**: React hooks and context
- **Build System**: Vite for fast development and optimized builds

## Prerequisites

- macOS 10.15 or later
- Node.js 18+ 
- Rust 1.70+
- Xcode Command Line Tools

## Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd nook
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Install Tauri CLI**
   ```bash
   npm install -g @tauri-apps/cli
   ```

4. **Build the application**
   ```bash
   npm run tauri:build
   ```

## Development

1. **Start development server**
   ```bash
   npm run tauri:dev
   ```

2. **Frontend only development**
   ```bash
   npm run dev
   ```

3. **Build for production**
   ```bash
   npm run build
   npm run tauri:build
   ```

## Project Structure

```
nook/
├── src/                          # React frontend
│   ├── components/               # Reusable UI components
│   │   └── Layout.tsx           # Main app layout
│   ├── pages/                    # Page components
│   │   ├── Dashboard.tsx        # Main dashboard
│   │   ├── Scanner.tsx          # Directory scanner
│   │   └── Settings.tsx         # Settings and license
│   ├── hooks/                    # Custom React hooks
│   ├── utils/                    # Utility functions
│   │   ├── cn.ts                # Class name utility
│   │   └── format.ts            # Formatting utilities
│   └── types/                    # TypeScript type definitions
│       └── index.ts             # Shared types
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   ├── main.rs              # Application entry point
│   │   ├── commands.rs          # Tauri command handlers
│   │   ├── filesystem/          # Filesystem operations
│   │   │   ├── mod.rs
│   │   │   ├── models.rs        # Data models
│   │   │   ├── scanner.rs       # Directory scanning logic
│   │   │   └── utils.rs         # Utility functions
│   │   └── license/             # License management
│   │       └── mod.rs
│   ├── Cargo.toml               # Rust dependencies
│   └── tauri.conf.json          # Tauri configuration
├── package.json                  # Node.js dependencies
├── tsconfig.json                # TypeScript configuration
├── vite.config.ts               # Vite build configuration
├── tailwind.config.js           # TailwindCSS configuration
└── README.md                    # This file
```

## Key Components

### Backend (Rust)

- **filesystem/scanner.rs**: Core scanning logic with parallel processing
- **filesystem/models.rs**: Data structures for scan results
- **license/mod.rs**: License validation and premium features
- **commands.rs**: Tauri command handlers for frontend communication

### Frontend (React)

- **Dashboard**: Overview of system storage usage
- **Scanner**: Directory scanning with configurable depth
- **Settings**: License management and app configuration

## License & Pricing

- **Free Version**: Scan and analyze disk usage
- **Premium Version ($5 one-time)**: 
  - Delete files and directories
  - Unlimited scanning depth
  - Advanced cleanup suggestions
  - Priority support

## Security

- Built-in safety checks prevent deletion of system-critical files
- License validation through Dodo Payments
- Local license storage (no telemetry)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support or feature requests, please open an issue on GitHub.
