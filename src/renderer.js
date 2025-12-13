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
