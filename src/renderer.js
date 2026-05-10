// Import marked from local lib folder
import { marked } from './lib/marked.js';

const openFileBtn = document.getElementById('openFile');
const themeToggleBtn = document.getElementById('themeToggle');
const increaseFontBtn = document.getElementById('increaseFont');
const decreaseFontBtn = document.getElementById('decreaseFont');
const contentDiv = document.getElementById('content');
const progressBar = document.getElementById('progressBar');

// Font size settings
const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 24;
const FONT_SIZE_STEP = 2;
let currentFontSize = 16;

// Initialize theme
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.body.className = savedTheme;
}

// Toggle theme
function toggleTheme() {
  const currentTheme = document.body.className || 'light';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.body.className = newTheme;
  localStorage.setItem('theme', newTheme);
}

// Render markdown content
function renderMarkdown(content, filePath) {
  // Configure marked options
  marked.setOptions({
    breaks: true,
    gfm: true
  });

  // Convert markdown to HTML
  const html = marked.parse(content);

  // Display the rendered markdown
  contentDiv.innerHTML = html;

  // Add tooltips to all links
  addLinkTooltips();

  // Add copy buttons to all code blocks
  addCodeCopyButtons();

  // Update window title
  const fileName = filePath.split(/[\\/]/).pop();
  document.title = `${fileName} - Markdown Reader`;
}

// Open and render markdown file
async function openFile() {
  try {
    const result = await window.electronAPI.openFile();

    if (result) {
      const { content, filePath } = result;
      renderMarkdown(content, filePath);
    }
  } catch (error) {
    console.error('Error opening file:', error);
    contentDiv.innerHTML = `
      <div class="welcome">
        <h2>Error</h2>
        <p>Failed to open the file. Please try again.</p>
      </div>
    `;
  }
}

// Add tooltips to links
function addLinkTooltips() {
  const links = contentDiv.querySelectorAll('a[href]');
  links.forEach(link => {
    const href = link.getAttribute('href');
    if (!link.hasAttribute('title')) {
      link.setAttribute('title', href);
    }
  });
}

// Add copy buttons to fenced code blocks
const COPY_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
const CHECK_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';

function addCodeCopyButtons() {
  const preBlocks = contentDiv.querySelectorAll('pre');
  preBlocks.forEach(pre => {
    const code = pre.querySelector('code');
    if (!code) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'code-block-wrapper';
    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);

    const button = document.createElement('button');
    button.className = 'code-copy-btn';
    button.type = 'button';
    button.innerHTML = COPY_ICON_SVG;
    button.setAttribute('aria-label', 'Copy code to clipboard');
    button.setAttribute('title', 'Copy');

    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(code.innerText);
        button.innerHTML = CHECK_ICON_SVG;
        button.setAttribute('title', 'Copied');
        button.classList.add('copied');
        setTimeout(() => {
          button.innerHTML = COPY_ICON_SVG;
          button.setAttribute('title', 'Copy');
          button.classList.remove('copied');
        }, 1500);
      } catch (err) {
        console.error('Failed to copy code:', err);
        button.setAttribute('title', 'Failed to copy');
        setTimeout(() => {
          button.setAttribute('title', 'Copy');
        }, 1500);
      }
    });

    wrapper.appendChild(button);
  });
}

// Font size functions
function initFontSize() {
  const savedFontSize = localStorage.getItem('fontSize');
  if (savedFontSize) {
    currentFontSize = parseInt(savedFontSize);
  }
  updateFontSize();
}

function updateFontSize() {
  document.documentElement.style.setProperty('--base-font-size', `${currentFontSize}px`);
  localStorage.setItem('fontSize', currentFontSize);

  // Update button states
  decreaseFontBtn.disabled = currentFontSize <= MIN_FONT_SIZE;
  increaseFontBtn.disabled = currentFontSize >= MAX_FONT_SIZE;
}

function increaseFont() {
  if (currentFontSize < MAX_FONT_SIZE) {
    currentFontSize += FONT_SIZE_STEP;
    updateFontSize();
  }
}

function decreaseFont() {
  if (currentFontSize > MIN_FONT_SIZE) {
    currentFontSize -= FONT_SIZE_STEP;
    updateFontSize();
  }
}

// Reading progress tracking
function updateProgressBar() {
  const main = document.querySelector('main');
  const scrollTop = main.scrollTop;
  const scrollHeight = main.scrollHeight - main.clientHeight;
  const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
  progressBar.style.width = `${progress}%`;
}

// Event listeners
themeToggleBtn.addEventListener('click', toggleTheme);
openFileBtn.addEventListener('click', openFile);
increaseFontBtn.addEventListener('click', increaseFont);
decreaseFontBtn.addEventListener('click', decreaseFont);

// Track scroll progress
const mainElement = document.querySelector('main');
mainElement.addEventListener('scroll', updateProgressBar);

// Listen for files opened from Finder
window.electronAPI.onFileOpened((data) => {
  const { content, filePath } = data;
  renderMarkdown(content, filePath);
});

// Initialize
initTheme();
initFontSize();
updateProgressBar();
