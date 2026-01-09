// MicroLabs Content Script - Captures page context

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_PAGE_CONTEXT') {
    const context = getPageContext();
    sendResponse(context);
  }

  if (request.type === 'GET_SELECTION') {
    const selection = window.getSelection()?.toString() || '';
    sendResponse({ selection });
  }

  if (request.type === 'GET_PAGE_CONTENT') {
    const content = getPageContent();
    sendResponse(content);
  }

  if (request.type === 'GET_PAGE_IMAGES') {
    const images = getPageImages();
    sendResponse({ images });
  }

  return true; // Keep channel open for async response
});

// Get full page context
function getPageContext() {
  const selection = window.getSelection()?.toString() || '';

  return {
    url: window.location.href,
    title: document.title,
    domain: window.location.hostname,
    pathname: window.location.pathname,
    selection: selection,
    selectionLength: selection.length,
    hasSelection: selection.length > 0,
    metaDescription: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
    metaKeywords: document.querySelector('meta[name="keywords"]')?.getAttribute('content') || '',
    ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '',
    ogDescription: document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '',
    ogImage: document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '',
    h1: document.querySelector('h1')?.textContent?.trim() || '',
    isGitHub: window.location.hostname.includes('github.com'),
    isYouTube: window.location.hostname.includes('youtube.com'),
    isLinkedIn: window.location.hostname.includes('linkedin.com'),
    isTwitter: window.location.hostname.includes('twitter.com') || window.location.hostname.includes('x.com'),
    isEmail: window.location.hostname.includes('mail.google.com') || window.location.hostname.includes('outlook'),
    timestamp: Date.now()
  };
}

// Get main page content (article/body text)
function getPageContent() {
  // Try to get article content first
  const article = document.querySelector('article');
  if (article) {
    return {
      content: article.innerText.trim(),
      type: 'article'
    };
  }

  // Try main content area
  const main = document.querySelector('main');
  if (main) {
    return {
      content: main.innerText.trim(),
      type: 'main'
    };
  }

  // Fallback to body (limited)
  const body = document.body.innerText;
  return {
    content: body.substring(0, 50000), // Limit to ~50k chars
    type: 'body'
  };
}

// Get images from page
function getPageImages() {
  const images = Array.from(document.querySelectorAll('img'))
    .filter(img => {
      const rect = img.getBoundingClientRect();
      return rect.width > 100 && rect.height > 100; // Only meaningful images
    })
    .slice(0, 20) // Limit to 20 images
    .map(img => ({
      src: img.src,
      alt: img.alt,
      width: img.naturalWidth,
      height: img.naturalHeight
    }));

  return images;
}

// Notify background script when selection changes
document.addEventListener('selectionchange', () => {
  const selection = window.getSelection()?.toString() || '';
  if (selection.length > 0) {
    chrome.runtime.sendMessage({
      type: 'SELECTION_CHANGED',
      selection: selection,
      length: selection.length
    }).catch(() => {}); // Ignore errors if sidepanel not open
  }
});
