// Import marked from local lib folder
import { marked } from './lib/marked.js';

const openFileBtn = document.getElementById('openFile');
const themeToggleBtn = document.getElementById('themeToggle');
const increaseFontBtn = document.getElementById('increaseFont');
const decreaseFontBtn = document.getElementById('decreaseFont');
const contentDiv = document.getElementById('content');
const progressBar = document.getElementById('progressBar');
const searchInput = document.getElementById('searchInput');
const searchCount = document.getElementById('searchCount');
const searchPrevBtn = document.getElementById('searchPrev');
const searchNextBtn = document.getElementById('searchNext');

// Font size settings
const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 24;
const FONT_SIZE_STEP = 2;
let currentFontSize = 16;

// Whether a document is currently displayed (vs. the welcome screen)
let documentLoaded = false;

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

  documentLoaded = true;

  // Re-apply any active search to the freshly rendered document
  runSearch();
}

// Escape a string for safe insertion into HTML
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

// Render the welcome screen, including a list of recent documents
function renderWelcome(recentFiles) {
  let recentHtml = '';

  if (recentFiles && recentFiles.length > 0) {
    const items = recentFiles.map(filePath => {
      const name = filePath.split(/[\\/]/).pop();
      return `<li class="recent-item" data-path="${escapeHtml(filePath)}" title="${escapeHtml(filePath)}">
        <span class="recent-name">${escapeHtml(name)}</span>
        <span class="recent-path">${escapeHtml(filePath)}</span>
      </li>`;
    }).join('');

    recentHtml = `
      <div class="recent-files">
        <h3>Recent Documents</h3>
        <ul class="recent-list">${items}</ul>
      </div>`;
  }

  contentDiv.innerHTML = `
    <div class="welcome">
      <h2>Welcome to Markdown Reader</h2>
      <p>Click "Open File" to load a Markdown file</p>
      ${recentHtml}
    </div>`;

  contentDiv.querySelectorAll('.recent-item').forEach(item => {
    item.addEventListener('click', () => openRecentFile(item.dataset.path));
  });

  documentLoaded = false;
  runSearch();
}

// Open a recent document by its file path
async function openRecentFile(filePath) {
  try {
    const result = await window.electronAPI.openRecentFile(filePath);
    if (result) {
      renderMarkdown(result.content, result.filePath);
    }
    // If the file is missing, the main process drops it and pushes an
    // updated recents list, which refreshes the welcome screen.
  } catch (error) {
    console.error('Error opening recent file:', error);
  }
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

// ---------------------------------------------------------------------------
// In-document search
// ---------------------------------------------------------------------------

// All <mark> elements for the current query, in document order
let searchMatches = [];
// Index into searchMatches of the highlighted "current" occurrence (-1 = none)
let currentMatchIndex = -1;

// Remove all highlight marks and merge the text nodes back together
function clearSearchHighlights() {
  const marks = contentDiv.querySelectorAll('mark.search-match');
  const parents = new Set();
  marks.forEach(mark => {
    const parent = mark.parentNode;
    if (!parent) return;
    parent.replaceChild(document.createTextNode(mark.textContent), mark);
    parents.add(parent);
  });
  // normalize() joins adjacent text nodes split by the previous highlight pass
  parents.forEach(parent => parent.normalize());
  searchMatches = [];
  currentMatchIndex = -1;
}

// Collect the text nodes of the rendered document that are eligible for search
function getSearchableTextNodes() {
  const walker = document.createTreeWalker(contentDiv, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      // Skip UI chrome injected into the document (e.g. copy buttons)
      if (parent.closest('.code-copy-btn, script, style')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const nodes = [];
  let node;
  while ((node = walker.nextNode())) {
    nodes.push(node);
  }
  return nodes;
}

// Wrap every case-insensitive occurrence of `query` in a <mark> element.
// Matching is done per text node, so a phrase split across inline elements
// (e.g. "**bo**ld") will not be found.
function highlightMatches(query) {
  const needle = query.toLowerCase();
  const textNodes = getSearchableTextNodes();

  textNodes.forEach(textNode => {
    const text = textNode.nodeValue;
    const haystack = text.toLowerCase();

    let index = haystack.indexOf(needle);
    if (index === -1) return;

    const fragment = document.createDocumentFragment();
    let lastIndex = 0;

    while (index !== -1) {
      if (index > lastIndex) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex, index)));
      }

      const mark = document.createElement('mark');
      mark.className = 'search-match';
      mark.textContent = text.slice(index, index + needle.length);
      fragment.appendChild(mark);
      searchMatches.push(mark);

      lastIndex = index + needle.length;
      index = haystack.indexOf(needle, lastIndex);
    }

    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    textNode.parentNode.replaceChild(fragment, textNode);
  });
}

// Update the "N of M" counter and the enabled state of the nav buttons
function updateSearchCount() {
  const total = searchMatches.length;
  const hasQuery = searchInput.value.length > 0;

  if (!hasQuery) {
    searchCount.textContent = '';
    searchCount.classList.remove('no-matches');
  } else if (total === 0) {
    searchCount.textContent = 'No matches';
    searchCount.classList.add('no-matches');
  } else {
    searchCount.textContent = `${currentMatchIndex + 1} of ${total}`;
    searchCount.classList.remove('no-matches');
  }

  searchPrevBtn.disabled = total === 0;
  searchNextBtn.disabled = total === 0;
}

// Make the match at `index` the current one and scroll it into view
function goToMatch(index) {
  const total = searchMatches.length;
  if (total === 0) {
    currentMatchIndex = -1;
    updateSearchCount();
    return;
  }

  if (currentMatchIndex >= 0 && searchMatches[currentMatchIndex]) {
    searchMatches[currentMatchIndex].classList.remove('current');
  }

  // Wrap around in both directions
  currentMatchIndex = ((index % total) + total) % total;

  const mark = searchMatches[currentMatchIndex];
  mark.classList.add('current');
  mark.scrollIntoView({ block: 'center', behavior: 'smooth' });

  updateSearchCount();
}

function goToNextMatch() {
  goToMatch(currentMatchIndex + 1);
}

function goToPrevMatch() {
  goToMatch(currentMatchIndex - 1);
}

// Re-run the search for the current input value against the rendered document
function runSearch() {
  clearSearchHighlights();

  const query = searchInput.value;
  if (query.length > 0 && documentLoaded) {
    highlightMatches(query);
  }

  if (searchMatches.length > 0) {
    goToMatch(0);
  } else {
    updateSearchCount();
  }
}

function clearSearch() {
  searchInput.value = '';
  runSearch();
}

function focusSearch() {
  searchInput.focus();
  searchInput.select();
}

// Event listeners
themeToggleBtn.addEventListener('click', toggleTheme);
openFileBtn.addEventListener('click', openFile);
increaseFontBtn.addEventListener('click', increaseFont);
decreaseFontBtn.addEventListener('click', decreaseFont);

// Search bar
searchInput.addEventListener('input', runSearch);
searchPrevBtn.addEventListener('click', goToPrevMatch);
searchNextBtn.addEventListener('click', goToNextMatch);

searchInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    if (event.shiftKey) {
      goToPrevMatch();
    } else {
      goToNextMatch();
    }
  } else if (event.key === 'Escape') {
    event.preventDefault();
    clearSearch();
    searchInput.blur();
  }
});

// Global shortcuts: Cmd/Ctrl+F focuses the search box, Tab / Shift+Tab cycle
// through the occurrences whenever there is an active search with matches.
document.addEventListener('keydown', (event) => {
  const isFindShortcut = (event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === 'f';
  if (isFindShortcut) {
    event.preventDefault();
    focusSearch();
    return;
  }

  if (event.key === 'Tab' && searchMatches.length > 0) {
    event.preventDefault();
    if (event.shiftKey) {
      goToPrevMatch();
    } else {
      goToNextMatch();
    }
  }
});

// Track scroll progress
const mainElement = document.querySelector('main');
mainElement.addEventListener('scroll', updateProgressBar);

// Listen for files opened from Finder
window.electronAPI.onFileOpened((data) => {
  const { content, filePath } = data;
  renderMarkdown(content, filePath);
});

// Refresh the welcome screen when the recents list changes (e.g. cleared
// from the menu), but only while no document is being viewed.
window.electronAPI.onRecentFilesUpdated((files) => {
  if (!documentLoaded) {
    renderWelcome(files);
  }
});

// Populate the welcome screen with recent documents on startup
async function initWelcome() {
  try {
    const recentFiles = await window.electronAPI.getRecentFiles();
    renderWelcome(recentFiles);
  } catch (error) {
    console.error('Error loading recent files:', error);
  }
}

// Initialize
initTheme();
initFontSize();
initWelcome();
updateProgressBar();
