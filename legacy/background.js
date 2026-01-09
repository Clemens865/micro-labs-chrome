// MicroLabs AI Tools - Background Service Worker

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ tabId: tab.id });
});

// Set side panel behavior
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Create context menu items
chrome.runtime.onInstalled.addListener(() => {
  // Parent menu
  chrome.contextMenus.create({
    id: 'microlabs-parent',
    title: 'MicroLabs AI',
    contexts: ['selection', 'page', 'image']
  });

  // Text selection menu items
  chrome.contextMenus.create({
    id: 'ml-summarize',
    parentId: 'microlabs-parent',
    title: 'Summarize Selection',
    contexts: ['selection']
  });

  chrome.contextMenus.create({
    id: 'ml-bullets',
    parentId: 'microlabs-parent',
    title: 'Convert to Bullets',
    contexts: ['selection']
  });

  chrome.contextMenus.create({
    id: 'ml-translate',
    parentId: 'microlabs-parent',
    title: 'Translate',
    contexts: ['selection']
  });

  chrome.contextMenus.create({
    id: 'ml-factcheck',
    parentId: 'microlabs-parent',
    title: 'Fact Check',
    contexts: ['selection']
  });

  chrome.contextMenus.create({
    id: 'ml-explain',
    parentId: 'microlabs-parent',
    title: 'Explain Simply',
    contexts: ['selection']
  });

  // Page menu items
  chrome.contextMenus.create({
    id: 'ml-page-summary',
    parentId: 'microlabs-parent',
    title: 'Summarize This Page',
    contexts: ['page']
  });

  chrome.contextMenus.create({
    id: 'ml-seo-analyze',
    parentId: 'microlabs-parent',
    title: 'Analyze SEO',
    contexts: ['page']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  // Open side panel first
  await chrome.sidePanel.open({ tabId: tab.id });

  // Send action to side panel
  setTimeout(() => {
    chrome.runtime.sendMessage({
      type: 'CONTEXT_MENU_ACTION',
      action: info.menuItemId,
      text: info.selectionText || '',
      pageUrl: info.pageUrl,
      srcUrl: info.srcUrl
    });
  }, 500); // Give panel time to load
});

// Handle messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // API Key management
  if (message.type === 'GET_API_KEY') {
    chrome.storage.local.get(['geminiApiKey'], (result) => {
      sendResponse({ apiKey: result.geminiApiKey || null });
    });
    return true;
  }

  if (message.type === 'SET_API_KEY') {
    chrome.storage.local.set({ geminiApiKey: message.apiKey }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  // Settings management
  if (message.type === 'GET_SETTINGS') {
    chrome.storage.local.get(['settings'], (result) => {
      sendResponse({ settings: result.settings || getDefaultSettings() });
    });
    return true;
  }

  if (message.type === 'SET_SETTINGS') {
    chrome.storage.local.set({ settings: message.settings }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  // Favorites management
  if (message.type === 'GET_FAVORITES') {
    chrome.storage.local.get(['favorites'], (result) => {
      sendResponse({ favorites: result.favorites || ['summarize', 'bullets', 'translate'] });
    });
    return true;
  }

  if (message.type === 'SET_FAVORITES') {
    chrome.storage.local.set({ favorites: message.favorites }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  // History management
  if (message.type === 'GET_HISTORY') {
    chrome.storage.local.get(['appHistory'], (result) => {
      sendResponse({ history: result.appHistory || [] });
    });
    return true;
  }

  if (message.type === 'ADD_TO_HISTORY') {
    chrome.storage.local.get(['appHistory'], (result) => {
      const history = result.appHistory || [];
      history.unshift(message.item);
      if (history.length > 100) history.pop();
      chrome.storage.local.set({ appHistory: history }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }

  // Get page context from content script
  if (message.type === 'GET_ACTIVE_TAB_CONTEXT') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]?.id) {
        try {
          const response = await chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_PAGE_CONTEXT' });
          sendResponse(response);
        } catch (error) {
          sendResponse({ error: 'Could not get page context' });
        }
      } else {
        sendResponse({ error: 'No active tab' });
      }
    });
    return true;
  }

  // Get selection from content script
  if (message.type === 'GET_ACTIVE_TAB_SELECTION') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]?.id) {
        try {
          const response = await chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_SELECTION' });
          sendResponse(response);
        } catch (error) {
          sendResponse({ selection: '' });
        }
      } else {
        sendResponse({ selection: '' });
      }
    });
    return true;
  }

  // Get page content
  if (message.type === 'GET_ACTIVE_TAB_CONTENT') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]?.id) {
        try {
          const response = await chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_PAGE_CONTENT' });
          sendResponse(response);
        } catch (error) {
          sendResponse({ content: '', error: 'Could not get page content' });
        }
      } else {
        sendResponse({ content: '', error: 'No active tab' });
      }
    });
    return true;
  }
});

// Forward selection changes to side panel
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'SELECTION_CHANGED') {
    // Broadcast to all extension pages (side panel)
    chrome.runtime.sendMessage(message).catch(() => {});
  }
});

function getDefaultSettings() {
  return {
    theme: 'dark',
    defaultLanguage: 'English',
    showContextHints: true,
    autoDetectContext: true
  };
}
