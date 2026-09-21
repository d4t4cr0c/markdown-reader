# Markdown Reader

A desktop application built with Electron for reading Markdown files with light/dark mode support.

## Features

- Open and read Markdown (.md, .markdown) files
- Beautiful markdown rendering using the `marked` library
- Light and Dark mode toggle
- Persistent theme preference
- Clean, distraction-free reading interface
- In-document search (⌘F / Ctrl+F): case-insensitive, shows "N of M" match count, Tab / Shift+Tab or Enter cycles through occurrences, Esc clears
- Support for all standard Markdown elements:
  - Headings
  - Lists (ordered and unordered)
  - Code blocks and inline code
  - Tables
  - Blockquotes
  - Links and images
  - And more!

## Installation

Install dependencies:

```bash
pnpm install
```

Note: If Electron doesn't install correctly, run:

```bash
cd node_modules/.pnpm/electron@39.2.7/node_modules/electron && node install.js
```

## Usage

Run the application:

```bash
npx electron .
```

Or if pnpm scripts work properly:

```bash
pnpm start
```

## How to Use

1. Click the "Open File" button in the header
2. Select a Markdown file from your file system
3. The file will be rendered in the main content area
4. Use the theme toggle button to switch between light and dark modes
5. Your theme preference is automatically saved

## Project Structure

- `main.js` - Main Electron process (window management, file operations)
- `preload.js` - Secure IPC bridge between main and renderer processes
- `index.html` - Application UI
- `styles.css` - Styling with light/dark theme support
- `renderer.js` - Frontend logic for file handling and theme toggling
- `sample.md` - Sample Markdown file for testing

## Technologies

- Electron 39.2.7
- Marked 17.0.1 (Markdown parser)
- Vanilla JavaScript (ES Modules)
