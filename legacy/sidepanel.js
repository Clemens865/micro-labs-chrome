// MicroLabs AI Tools - Specialized Apps Side Panel
// 6 Specialized AI-powered apps with unique workflows and UIs

import { GoogleGenAI, Type } from './lib/genai.esm.js';

// ============================================================================
// State Management
// ============================================================================
const state = {
  apiKey: null,
  settings: { theme: 'dark', defaultLanguage: 'English' },
  pageContext: null,
  selection: '',
  currentPanel: 'home',

  // Chat state
  chatMessages: [],
  chatPageContent: '',

  // Quick Tools state
  currentTool: 'translate',

  // Email state
  currentScenario: 'reply',
  currentTone: 'professional'
};

// ============================================================================
// DOM Elements Cache
// ============================================================================
const $ = (id) => document.getElementById(id);

const panels = {
  apiKeySetup: $('apiKeySetup'),
  home: $('homePanel'),
  pageDigest: $('pageDigestPanel'),
  youtubeDigest: $('youtubeDigestPanel'),
  chat: $('chatPanel'),
  seo: $('seoPanel'),
  quickTools: $('quickToolsPanel'),
  email: $('emailPanel'),
  settings: $('settingsPanel')
};

// ============================================================================
// Initialization
// ============================================================================
async function init() {
  await loadApiKey();
  setupEventListeners();
  updateUI();
  refreshPageContext();

  // Listen for messages from background
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'CONTEXT_MENU_ACTION') {
      handleContextMenuAction(message);
    }
    if (message.type === 'SELECTION_CHANGED') {
      state.selection = message.selection;
      updateSelectionUI();
    }
  });
}

async function loadApiKey() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_API_KEY' }, (response) => {
      state.apiKey = response?.apiKey || null;
      resolve();
    });
  });
}

function getAI() {
  if (!state.apiKey) throw new Error('API key not set');
  return new GoogleGenAI({ apiKey: state.apiKey });
}

// ============================================================================
// Event Listeners
// ============================================================================
function setupEventListeners() {
  // Header
  $('settingsBtn').addEventListener('click', () => showPanel('settings'));
  $('logoHome').addEventListener('click', () => showPanel('home'));

  // API Key Setup
  $('saveApiKeyBtn').addEventListener('click', saveApiKey);

  // Context refresh
  $('refreshContext').addEventListener('click', refreshPageContext);

  // Back buttons
  document.querySelectorAll('[data-back]').forEach(btn => {
    btn.addEventListener('click', () => showPanel(btn.dataset.back));
  });

  // App cards
  document.querySelectorAll('[data-app]').forEach(card => {
    card.addEventListener('click', () => {
      const app = card.dataset.app;
      showPanel(app === 'chatWithPage' ? 'chat' : app === 'seoAnalyzer' ? 'seo' : app);
    });
  });

  // Selection quick actions
  document.querySelectorAll('.selection-btn').forEach(btn => {
    btn.addEventListener('click', () => handleSelectionAction(btn.dataset.action));
  });

  // Page Digest
  $('digestPageBtn').addEventListener('click', generatePageDigest);
  $('copyDigestBtn')?.addEventListener('click', copyDigest);
  $('chatAboutPageBtn')?.addEventListener('click', () => {
    showPanel('chat');
  });

  // YouTube Digest
  $('summarizeVideoBtn').addEventListener('click', summarizeVideo);
  $('youtubeUrlInput').addEventListener('input', handleYoutubeUrlChange);
  document.querySelectorAll('#youtubeDigestPanel .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchYoutubeTab(btn.dataset.tab));
  });

  // Chat
  $('chatInput').addEventListener('input', updateChatSendButton);
  $('chatInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });
  $('sendChatBtn').addEventListener('click', sendChatMessage);
  $('clearChatBtn').addEventListener('click', clearChat);
  document.querySelectorAll('.suggested-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $('chatInput').value = btn.textContent;
      sendChatMessage();
    });
  });

  // SEO
  $('analyzeSeoBtn').addEventListener('click', analyzeSEO);

  // Quick Tools
  document.querySelectorAll('.tool-tab').forEach(tab => {
    tab.addEventListener('click', () => selectTool(tab.dataset.tool));
  });
  $('pasteSelectionBtn').addEventListener('click', pasteSelection);
  $('toolInput').addEventListener('input', updateToolCharCount);
  $('processToolBtn').addEventListener('click', processQuickTool);
  $('copyToolOutput').addEventListener('click', copyToolOutput);

  // Email Composer
  document.querySelectorAll('.scenario-btn').forEach(btn => {
    btn.addEventListener('click', () => selectScenario(btn.dataset.scenario));
  });
  document.querySelectorAll('.tone-btn').forEach(btn => {
    btn.addEventListener('click', () => selectTone(btn.dataset.tone));
  });
  $('generateEmailBtn').addEventListener('click', generateEmail);
  $('copyEmailBtn').addEventListener('click', copyEmail);
  $('regenerateEmailBtn').addEventListener('click', generateEmail);

  // Settings
  $('updateApiKeyBtn').addEventListener('click', updateApiKey);
}

// ============================================================================
// Panel Navigation
// ============================================================================
function showPanel(panelId) {
  state.currentPanel = panelId;

  // Hide all panels
  Object.values(panels).forEach(p => p?.classList.add('hidden'));

  // Show target panel
  const panel = panels[panelId];
  if (panel) {
    panel.classList.remove('hidden');

    // Initialize panel-specific content
    if (panelId === 'pageDigest') initPageDigestPanel();
    if (panelId === 'youtubeDigest') initYoutubeDigestPanel();
    if (panelId === 'chat') initChatPanel();
    if (panelId === 'seo') initSEOPanel();
    if (panelId === 'quickTools') initQuickToolsPanel();
    if (panelId === 'settings') initSettingsPanel();
  }
}

function updateUI() {
  if (!state.apiKey) {
    showPanel('apiKeySetup');
  } else {
    showPanel('home');
  }
}

// ============================================================================
// Context Management
// ============================================================================
async function refreshPageContext() {
  try {
    const context = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_ACTIVE_TAB_CONTEXT' }, resolve);
    });

    state.pageContext = context;
    state.selection = context?.selection || '';
    updateContextBanner();
    updateSelectionUI();
  } catch (error) {
    console.error('Failed to get page context:', error);
  }
}

function updateContextBanner() {
  const ctx = state.pageContext;
  const label = $('contextLabel');
  const detail = $('contextDetail');
  const banner = $('contextBanner');

  if (state.selection) {
    banner.classList.add('has-selection');
    label.textContent = 'Text Selected';
    detail.textContent = truncate(state.selection, 50);
  } else if (ctx?.title) {
    banner.classList.remove('has-selection');
    label.textContent = truncate(ctx.title, 30);
    detail.textContent = ctx.domain || ctx.url;
  } else {
    banner.classList.remove('has-selection');
    label.textContent = 'Ready';
    detail.textContent = 'Browse to a page to get started';
  }

  // YouTube card highlight
  const ytCard = $('youtubeCard');
  if (ytCard && ctx?.isYouTube) {
    ytCard.classList.add('highlighted');
  } else if (ytCard) {
    ytCard.classList.remove('highlighted');
  }
}

function updateSelectionUI() {
  const actions = $('selectionActions');
  const preview = $('selectionPreview');

  if (state.selection && state.selection.length > 0) {
    actions.classList.remove('hidden');
    preview.textContent = truncate(state.selection, 30);
  } else {
    actions.classList.add('hidden');
  }
}

function handleSelectionAction(action) {
  showPanel('quickTools');
  selectTool(action === 'summarize' ? 'translate' : action);
  $('toolInput').value = state.selection;
  updateToolCharCount();
}

// ============================================================================
// API Key Management
// ============================================================================
async function saveApiKey() {
  const apiKey = $('apiKeyInput').value.trim();
  if (!apiKey) {
    showToast('Please enter an API key', 'error');
    return;
  }

  state.apiKey = apiKey;
  chrome.runtime.sendMessage({ type: 'SET_API_KEY', apiKey });
  showToast('API key saved');
  updateUI();
}

async function updateApiKey() {
  const apiKey = $('settingsApiKey').value.trim();
  if (!apiKey || apiKey.includes('•')) {
    showToast('Please enter a new API key', 'error');
    return;
  }

  state.apiKey = apiKey;
  chrome.runtime.sendMessage({ type: 'SET_API_KEY', apiKey });
  showToast('API key updated');
  $('settingsApiKey').value = '••••••••••••';
}

function initSettingsPanel() {
  $('settingsApiKey').value = state.apiKey ? '••••••••••••' : '';
}

// ============================================================================
// PAGE DIGEST
// ============================================================================
async function initPageDigestPanel() {
  // Always refresh context when entering Page Digest to get current page
  await refreshPageContext();

  const ctx = state.pageContext;
  $('pageTitle').textContent = ctx?.title || 'No page loaded';
  $('pageUrl').textContent = ctx?.url || '';

  // Reset results
  $('digestLoading').classList.add('hidden');
  $('digestResults').classList.add('hidden');
  $('digestPageBtn').disabled = false;
}

async function generatePageDigest() {
  const ctx = state.pageContext;
  if (!ctx?.url) {
    showToast('No page to digest', 'error');
    return;
  }

  // Get page content
  const contentResult = await new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_ACTIVE_TAB_CONTENT' }, resolve);
  });

  const content = contentResult?.content || '';
  if (!content) {
    showToast('Could not get page content', 'error');
    return;
  }

  // Show loading
  $('digestPageBtn').disabled = true;
  $('digestLoading').classList.remove('hidden');
  $('digestResults').classList.add('hidden');

  const statusEl = $('loadingStatus');
  statusEl.textContent = 'Reading page content...';

  try {
    const ai = getAI();

    statusEl.textContent = 'Analyzing content structure...';

    const prompt = `
      Analyze this webpage and create a structured digest.

      Page Title: ${ctx.title}
      URL: ${ctx.url}

      Page Content:
      ${content.substring(0, 30000)}

      Create a comprehensive digest with:
      1. A 2-3 sentence summary
      2. 5-7 key takeaways (the most important points)
      3. Major content sections/topics covered
    `.trim();

    statusEl.textContent = 'Generating digest...';

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: 'A 2-3 sentence summary' },
            keyPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '5-7 key takeaways'
            },
            sections: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Major content sections/topics'
            }
          },
          required: ['summary', 'keyPoints', 'sections']
        }
      }
    });

    const result = JSON.parse(response.text || '{}');

    // Render results
    $('digestLoading').classList.add('hidden');
    $('digestResults').classList.remove('hidden');

    $('digestSummary').textContent = result.summary || '';

    $('digestPoints').innerHTML = (result.keyPoints || []).map((point, i) => `
      <div class="digest-point">
        <div class="digest-point-marker">${i + 1}</div>
        <div class="digest-point-text">${escapeHtml(point)}</div>
      </div>
    `).join('');

    $('digestSections').innerHTML = (result.sections || []).map(section => `
      <div class="digest-section-item">${escapeHtml(section)}</div>
    `).join('');

  } catch (error) {
    console.error('Digest error:', error);
    $('digestLoading').classList.add('hidden');
    showToast(error.message || 'Failed to generate digest', 'error');
  }

  $('digestPageBtn').disabled = false;
}

function copyDigest() {
  const summary = $('digestSummary').textContent;
  const points = Array.from($('digestPoints').querySelectorAll('.digest-point-text'))
    .map((el, i) => `${i + 1}. ${el.textContent}`).join('\n');

  const text = `SUMMARY:\n${summary}\n\nKEY POINTS:\n${points}`;
  navigator.clipboard.writeText(text);
  showToast('Digest copied');
}

// ============================================================================
// YOUTUBE DIGEST
// ============================================================================
async function initYoutubeDigestPanel() {
  // Refresh context to check if we're on YouTube
  await refreshPageContext();

  // Auto-fill URL if on YouTube page
  if (state.pageContext?.isYouTube && state.pageContext?.url) {
    $('youtubeUrlInput').value = state.pageContext.url;
    handleYoutubeUrlChange();
  }

  // Reset results
  $('youtubeLoading').classList.add('hidden');
  $('youtubeResults').classList.add('hidden');
  $('summarizeVideoBtn').disabled = false;
}

function handleYoutubeUrlChange() {
  const url = $('youtubeUrlInput').value.trim();
  const videoId = extractYoutubeVideoId(url);

  if (videoId) {
    $('videoPreview').classList.remove('hidden');
    $('videoThumbnail').innerHTML = `<img src="https://img.youtube.com/vi/${videoId}/mqdefault.jpg" alt="Video thumbnail">`;
    $('videoTitle').textContent = 'Video loaded - Ready to summarize';
  } else {
    $('videoPreview').classList.add('hidden');
  }
}

function extractYoutubeVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

async function summarizeVideo() {
  let url = $('youtubeUrlInput').value.trim();

  // Auto-detect from page context if on YouTube
  if (!url && state.pageContext?.isYouTube) {
    url = state.pageContext.url;
    $('youtubeUrlInput').value = url;
    handleYoutubeUrlChange();
  }

  const videoId = extractYoutubeVideoId(url);
  if (!videoId) {
    showToast('Please enter a valid YouTube URL', 'error');
    return;
  }

  // Show loading
  $('summarizeVideoBtn').disabled = true;
  $('youtubeLoading').classList.remove('hidden');
  $('youtubeResults').classList.add('hidden');

  const statusEl = $('ytLoadingStatus');
  statusEl.textContent = 'Fetching video information...';

  try {
    const ai = getAI();

    statusEl.textContent = 'Analyzing video content...';

    // Use Gemini to analyze the YouTube video
    const prompt = `
      Analyze this YouTube video: https://www.youtube.com/watch?v=${videoId}

      Search for information about this video and provide:
      1. A comprehensive summary of the video content
      2. Key chapters or sections with approximate timestamps
      3. Main topics discussed

      Use Google Search to find information about this specific video.
    `.trim();

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Video title' },
            summary: { type: Type.STRING, description: 'Comprehensive summary' },
            chapters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  timestamp: { type: Type.STRING },
                  title: { type: Type.STRING },
                  summary: { type: Type.STRING }
                }
              },
              description: 'Key chapters with timestamps'
            },
            mainTopics: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Main topics discussed'
            }
          },
          required: ['summary']
        }
      }
    });

    const result = JSON.parse(response.text || '{}');

    // Update video title if found
    if (result.title) {
      $('videoTitle').textContent = result.title;
    }

    // Show results
    $('youtubeLoading').classList.add('hidden');
    $('youtubeResults').classList.remove('hidden');

    // Render summary tab
    let summaryHtml = `<div class="yt-summary-text">${escapeHtml(result.summary || 'Could not get video summary')}</div>`;

    if (result.mainTopics && result.mainTopics.length > 0) {
      summaryHtml += `
        <div class="yt-topics">
          <h4>Main Topics</h4>
          <div class="topic-tags">
            ${result.mainTopics.map(t => `<span class="topic-tag">${escapeHtml(t)}</span>`).join('')}
          </div>
        </div>
      `;
    }

    $('ytSummary').innerHTML = summaryHtml;

    // Render chapters
    if (result.chapters && result.chapters.length > 0) {
      $('ytChapters').innerHTML = `
        <h4>Chapters</h4>
        ${result.chapters.map(ch => `
          <div class="yt-chapter">
            <span class="yt-chapter-time">${escapeHtml(ch.timestamp || '0:00')}</span>
            <div class="yt-chapter-content">
              <span class="yt-chapter-title">${escapeHtml(ch.title || '')}</span>
              ${ch.summary ? `<span class="yt-chapter-summary">${escapeHtml(ch.summary)}</span>` : ''}
            </div>
          </div>
        `).join('')}
      `;
    } else {
      $('ytChapters').innerHTML = '';
    }

    // Transcript placeholder
    $('ytTranscript').innerHTML = '<p class="text-muted">Transcript not available for this video.</p>';

  } catch (error) {
    console.error('YouTube error:', error);
    $('youtubeLoading').classList.add('hidden');
    showToast(error.message || 'Failed to analyze video', 'error');
  }

  $('summarizeVideoBtn').disabled = false;
}

function switchYoutubeTab(tabId) {
  document.querySelectorAll('#youtubeDigestPanel .tab-btn').forEach(t => t.classList.remove('active'));
  document.querySelector(`#youtubeDigestPanel .tab-btn[data-tab="${tabId}"]`).classList.add('active');

  document.querySelectorAll('#youtubeDigestPanel .tab-content').forEach(c => c.classList.remove('active'));
  $(tabId === 'summary' ? 'summaryTab' : 'transcriptTab').classList.add('active');
}

// ============================================================================
// CHAT WITH PAGE
// ============================================================================
async function initChatPanel() {
  const ctx = state.pageContext;
  $('chatPageTitle').textContent = ctx?.title || 'No page loaded';

  // Get page content for context
  if (!state.chatPageContent || state.chatPageContent.url !== ctx?.url) {
    const contentResult = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_ACTIVE_TAB_CONTENT' }, resolve);
    });
    state.chatPageContent = {
      url: ctx?.url,
      content: contentResult?.content || ''
    };
  }
}

function updateChatSendButton() {
  $('sendChatBtn').disabled = !$('chatInput').value.trim();
}

async function sendChatMessage() {
  const input = $('chatInput').value.trim();
  if (!input) return;

  // Clear input
  $('chatInput').value = '';
  updateChatSendButton();

  // Hide welcome message
  const welcome = document.querySelector('.chat-welcome');
  if (welcome) welcome.style.display = 'none';

  // Add user message
  addChatMessage('user', input);
  state.chatMessages.push({ role: 'user', content: input });

  // Add loading message
  const loadingId = addChatMessage('assistant', '<div class="typing-indicator"><span></span><span></span><span></span></div>', true);

  try {
    const ai = getAI();

    // Build conversation history
    const history = state.chatMessages.map(m => ({
      role: m.role,
      parts: [{ text: m.content }]
    }));

    const systemPrompt = `You are a helpful assistant answering questions about a webpage.

Page Title: ${state.pageContext?.title || 'Unknown'}
Page URL: ${state.pageContext?.url || 'Unknown'}

Page Content:
${state.chatPageContent?.content?.substring(0, 25000) || 'No content available'}

Answer questions based on this page content. Be concise and helpful. If the answer isn't in the page content, say so.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: history,
      config: {
        systemInstruction: systemPrompt
      }
    });

    const answer = response.text || 'I could not generate a response.';

    // Remove loading and add response
    removeMessage(loadingId);
    addChatMessage('assistant', answer);
    state.chatMessages.push({ role: 'model', content: answer });

  } catch (error) {
    console.error('Chat error:', error);
    removeMessage(loadingId);
    addChatMessage('assistant', `Error: ${error.message}`);
  }
}

function addChatMessage(role, content, isLoading = false) {
  const id = `msg-${Date.now()}`;
  const messagesEl = $('chatMessages');

  const messageHtml = `
    <div class="chat-message ${role}" id="${id}">
      <div class="message-avatar">${role === 'user' ? '👤' : '🤖'}</div>
      <div class="message-content">${isLoading ? content : escapeHtml(content).replace(/\n/g, '<br>')}</div>
    </div>
  `;

  messagesEl.insertAdjacentHTML('beforeend', messageHtml);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  return id;
}

function removeMessage(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function clearChat() {
  state.chatMessages = [];
  $('chatMessages').innerHTML = `
    <div class="chat-welcome">
      <div class="welcome-icon">💬</div>
      <h3>Ask anything about this page</h3>
      <p>I've read the content and can answer questions, explain concepts, or find specific information.</p>
      <div class="suggested-questions" id="suggestedQuestions">
        <button class="suggested-btn">What is this page about?</button>
        <button class="suggested-btn">What are the key points?</button>
        <button class="suggested-btn">Summarize in 3 bullets</button>
      </div>
    </div>
  `;

  // Re-attach suggested question handlers
  document.querySelectorAll('.suggested-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $('chatInput').value = btn.textContent;
      sendChatMessage();
    });
  });
}

// ============================================================================
// SEO ANALYZER
// ============================================================================
async function initSEOPanel() {
  // Always refresh context when entering SEO panel to get current page
  await refreshPageContext();

  const ctx = state.pageContext;
  $('seoUrl').textContent = ctx?.url || 'No page loaded';

  // Reset
  $('seoLoading').classList.add('hidden');
  $('seoResults').classList.add('hidden');
  $('analyzeSeoBtn').disabled = false;
}

async function analyzeSEO() {
  const ctx = state.pageContext;
  if (!ctx?.url) {
    showToast('No page to analyze', 'error');
    return;
  }

  $('analyzeSeoBtn').disabled = true;
  $('seoLoading').classList.remove('hidden');
  $('seoResults').classList.add('hidden');

  // Animate loading steps
  const steps = ['step1', 'step2', 'step3', 'step4'];
  let currentStep = 0;

  const stepInterval = setInterval(() => {
    if (currentStep > 0) {
      $(steps[currentStep - 1]).classList.remove('active');
      $(steps[currentStep - 1]).classList.add('done');
    }
    if (currentStep < steps.length) {
      $(steps[currentStep]).classList.add('active');
      currentStep++;
    }
  }, 800);

  try {
    const ai = getAI();

    // Get page content for analysis
    const contentResult = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_ACTIVE_TAB_CONTENT' }, resolve);
    });

    const prompt = `
      Perform a comprehensive SEO audit for this webpage.

      Page Info:
      - URL: ${ctx.url}
      - Title: ${ctx.title}
      - Meta Description: ${ctx.metaDescription || 'Not set'}
      - H1: ${ctx.h1 || 'Not found'}
      - OG Title: ${ctx.ogTitle || 'Not set'}
      - OG Description: ${ctx.ogDescription || 'Not set'}

      Content Preview:
      ${contentResult?.content?.substring(0, 5000) || 'Could not get content'}

      Analyze and provide:
      1. Overall SEO score (0-100)
      2. Critical issues that need fixing
      3. Actionable recommendations
      4. Meta tag analysis
    `.trim();

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER, description: 'SEO score 0-100' },
            verdict: { type: Type.STRING, description: 'One-word verdict: Excellent/Good/Fair/Poor' },
            issues: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Critical issues found'
            },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Actionable recommendations'
            },
            meta: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  value: { type: Type.STRING },
                  status: { type: Type.STRING, description: 'good/warning/error' }
                }
              },
              description: 'Meta tag analysis'
            }
          },
          required: ['score', 'verdict', 'issues', 'recommendations']
        }
      }
    });

    clearInterval(stepInterval);
    const result = JSON.parse(response.text || '{}');

    // Show results
    $('seoLoading').classList.add('hidden');
    $('seoResults').classList.remove('hidden');

    // Render score ring
    const score = result.score || 0;
    const scoreClass = score >= 70 ? 'good' : score >= 40 ? 'medium' : 'poor';
    const circumference = 2 * Math.PI * 54;
    const offset = circumference - (score / 100) * circumference;

    $('scoreRing').className = `score-ring ${scoreClass}`;
    $('scoreFill').style.strokeDashoffset = offset;
    $('scoreValue').textContent = score;
    $('scoreVerdict').textContent = result.verdict || '';
    $('scoreVerdict').style.color = `var(--${scoreClass === 'good' ? 'success' : scoreClass === 'medium' ? 'warning' : 'error'})`;

    // Render issues
    $('seoIssuesList').innerHTML = (result.issues || []).map(issue =>
      `<div class="seo-issue-item">${escapeHtml(issue)}</div>`
    ).join('') || '<p class="text-muted">No critical issues found!</p>';

    // Render recommendations
    $('seoRecommendationsList').innerHTML = (result.recommendations || []).map(rec =>
      `<div class="seo-recommendation-item">${escapeHtml(rec)}</div>`
    ).join('');

    // Render meta
    $('seoMetaList').innerHTML = (result.meta || []).map(m =>
      `<div class="seo-meta-item">
        <span class="meta-label">${escapeHtml(m.name)}</span>
        <span class="meta-value ${m.status}">${escapeHtml(m.value)}</span>
      </div>`
    ).join('');

  } catch (error) {
    clearInterval(stepInterval);
    console.error('SEO error:', error);
    $('seoLoading').classList.add('hidden');
    showToast(error.message || 'Failed to analyze SEO', 'error');
  }

  $('analyzeSeoBtn').disabled = false;
}

// ============================================================================
// QUICK TOOLS
// ============================================================================
function initQuickToolsPanel() {
  selectTool(state.currentTool);

  // Pre-fill with selection if available
  if (state.selection) {
    $('toolInput').value = state.selection;
    updateToolCharCount();
  }
}

function selectTool(toolId) {
  state.currentTool = toolId;

  // Update tabs
  document.querySelectorAll('.tool-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tool === toolId);
  });

  // Update options and button text
  const toolConfig = {
    translate: { btnText: 'Translate', options: renderTranslateOptions() },
    explain: { btnText: 'Explain', options: renderExplainOptions() },
    bullets: { btnText: 'Extract Bullets', options: '' },
    factcheck: { btnText: 'Fact Check', options: '' },
    rewrite: { btnText: 'Rewrite', options: renderRewriteOptions() }
  };

  const config = toolConfig[toolId] || { btnText: 'Process', options: '' };
  $('processToolText').textContent = config.btnText;
  $('toolOptions').innerHTML = config.options;
  $('toolOptions').classList.toggle('hidden', !config.options);
}

function renderTranslateOptions() {
  const languages = ['Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Korean', 'Portuguese', 'Italian', 'Russian', 'Arabic'];
  return `
    <div class="option-group">
      <label class="option-label">To</label>
      <select class="option-select" id="translateLang">
        ${languages.map(l => `<option value="${l}">${l}</option>`).join('')}
      </select>
    </div>
  `;
}

function renderExplainOptions() {
  const levels = ['5-year-old', 'High School', 'College', 'Expert'];
  return `
    <div class="option-group">
      <label class="option-label">Level</label>
      <select class="option-select" id="explainLevel">
        ${levels.map(l => `<option value="${l}" ${l === 'High School' ? 'selected' : ''}>${l}</option>`).join('')}
      </select>
    </div>
  `;
}

function renderRewriteOptions() {
  const tones = ['Professional', 'Casual', 'Formal', 'Friendly', 'Concise'];
  return `
    <div class="option-group">
      <label class="option-label">Tone</label>
      <select class="option-select" id="rewriteTone">
        ${tones.map(t => `<option value="${t}">${t}</option>`).join('')}
      </select>
    </div>
  `;
}

function updateToolCharCount() {
  const count = $('toolInput').value.length;
  $('toolCharCount').textContent = `${count} characters`;
}

function pasteSelection() {
  if (state.selection) {
    $('toolInput').value = state.selection;
    updateToolCharCount();
    showToast('Selection pasted');
  } else {
    showToast('No text selected', 'error');
  }
}

async function processQuickTool() {
  const input = $('toolInput').value.trim();
  if (!input) {
    showToast('Please enter some text', 'error');
    return;
  }

  $('processToolBtn').disabled = true;
  $('toolLoading').classList.remove('hidden');
  $('toolOutput').classList.add('hidden');

  try {
    const ai = getAI();
    let result;

    switch (state.currentTool) {
      case 'translate':
        result = await processTranslate(ai, input);
        break;
      case 'explain':
        result = await processExplain(ai, input);
        break;
      case 'bullets':
        result = await processBullets(ai, input);
        break;
      case 'factcheck':
        result = await processFactCheck(ai, input);
        break;
      case 'rewrite':
        result = await processRewrite(ai, input);
        break;
      default:
        throw new Error('Unknown tool');
    }

    // Show result
    $('toolLoading').classList.add('hidden');
    $('toolOutput').classList.remove('hidden');
    $('toolOutputContent').innerHTML = result.html;

    // Show sources if available
    if (result.sources && result.sources.length > 0) {
      $('toolSources').classList.remove('hidden');
      $('toolSourcesList').innerHTML = result.sources.map(s =>
        `<a href="${s.uri}" target="_blank" class="source-link">${escapeHtml(s.title)}</a>`
      ).join('');
    } else {
      $('toolSources').classList.add('hidden');
    }

  } catch (error) {
    console.error('Tool error:', error);
    $('toolLoading').classList.add('hidden');
    showToast(error.message || 'Processing failed', 'error');
  }

  $('processToolBtn').disabled = false;
}

async function processTranslate(ai, input) {
  const lang = $('translateLang')?.value || 'Spanish';

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: `Translate the following text to ${lang}. Only provide the translation, no explanations.\n\n${input}`
  });

  return { html: `<div class="translation-result">${escapeHtml(response.text || '')}</div>` };
}

async function processExplain(ai, input) {
  const level = $('explainLevel')?.value || 'High School';

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: `Explain the following concept as if explaining to a ${level.toLowerCase()} student. Be clear and use simple analogies where helpful.\n\n${input}`
  });

  return { html: `<div class="explanation-result">${escapeHtml(response.text || '').replace(/\n/g, '<br>')}</div>` };
}

async function processBullets(ai, input) {
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: `Extract the key points from this text as clear, concise bullet points. Focus on the most important information.\n\n${input}`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          bullets: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Extracted key points'
          }
        },
        required: ['bullets']
      }
    }
  });

  const result = JSON.parse(response.text || '{"bullets":[]}');

  const html = `<ul class="bullet-list">
    ${(result.bullets || []).map((point, i) => `
      <li class="bullet-item">
        <span class="bullet-number">${i + 1}</span>
        <span class="bullet-text">${escapeHtml(point)}</span>
      </li>
    `).join('')}
  </ul>`;

  return { html };
}

async function processFactCheck(ai, input) {
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: `Verify this claim using Google Search: "${input}"\n\nProvide a verdict and explanation.`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          status: { type: Type.STRING, description: 'TRUE, FALSE, PARTIALLY_TRUE, or UNVERIFIED' },
          score: { type: Type.NUMBER, description: 'Confidence score 0-100' },
          explanation: { type: Type.STRING, description: 'Detailed explanation' }
        },
        required: ['status', 'explanation']
      }
    }
  });

  const result = JSON.parse(response.text || '{}');
  const sources = extractSources(response);

  const statusColors = {
    'TRUE': 'var(--success)',
    'FALSE': 'var(--error)',
    'PARTIALLY_TRUE': 'var(--warning)',
    'UNVERIFIED': 'var(--text-muted)'
  };
  const statusIcons = { 'TRUE': '✓', 'FALSE': '✗', 'PARTIALLY_TRUE': '~', 'UNVERIFIED': '?' };
  const status = result.status || 'UNVERIFIED';

  const html = `
    <div class="factcheck-result">
      <div class="factcheck-header" style="color: ${statusColors[status] || statusColors.UNVERIFIED}">
        <span class="factcheck-icon">${statusIcons[status] || '?'}</span>
        <span class="factcheck-status">${status.replace('_', ' ')}</span>
        ${result.score ? `<span class="factcheck-score">${result.score}/100</span>` : ''}
      </div>
      <div class="factcheck-explanation">${escapeHtml(result.explanation || '')}</div>
    </div>
  `;

  return { html, sources };
}

async function processRewrite(ai, input) {
  const tone = $('rewriteTone')?.value || 'Professional';

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: `Rewrite the following text in a ${tone.toLowerCase()} tone. Maintain the original meaning while improving clarity and style.\n\n${input}`
  });

  return { html: `<div class="rewrite-result">${escapeHtml(response.text || '').replace(/\n/g, '<br>')}</div>` };
}

function copyToolOutput() {
  const text = $('toolOutputContent').innerText;
  navigator.clipboard.writeText(text);
  showToast('Copied to clipboard');
}

// ============================================================================
// EMAIL COMPOSER
// ============================================================================
function selectScenario(scenario) {
  state.currentScenario = scenario;
  document.querySelectorAll('.scenario-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.scenario === scenario);
  });
}

function selectTone(tone) {
  state.currentTone = tone;
  document.querySelectorAll('.tone-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tone === tone);
  });
}

async function generateEmail() {
  const context = $('emailContext').value.trim();
  if (!context) {
    showToast('Please provide context or the original message', 'error');
    return;
  }

  $('generateEmailBtn').disabled = true;
  $('emailLoading').classList.remove('hidden');
  $('emailResult').classList.add('hidden');

  try {
    const ai = getAI();

    const scenarioPrompts = {
      reply: 'Write a reply to this email/message',
      followup: 'Write a follow-up email for this situation',
      request: 'Write a request email for this situation',
      difficult: 'Write a professional email handling this difficult situation'
    };

    const prompt = `
      ${scenarioPrompts[state.currentScenario]}.

      Context/Original Message:
      ${context}

      Tone: ${state.currentTone}

      Provide a complete email with subject line and body.
      Also provide 3 tips for handling this type of communication.
    `.trim();

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING, description: 'Email subject line' },
            body: { type: Type.STRING, description: 'Email body' },
            tips: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3 communication tips'
            }
          },
          required: ['subject', 'body', 'tips']
        }
      }
    });

    const result = JSON.parse(response.text || '{}');

    // Show result
    $('emailLoading').classList.add('hidden');
    $('emailResult').classList.remove('hidden');

    $('emailSubject').textContent = result.subject || '';
    $('emailBody').textContent = result.body || '';
    $('emailTipsList').innerHTML = (result.tips || []).map(t =>
      `<li>${escapeHtml(t)}</li>`
    ).join('');

  } catch (error) {
    console.error('Email error:', error);
    $('emailLoading').classList.add('hidden');
    showToast(error.message || 'Failed to generate email', 'error');
  }

  $('generateEmailBtn').disabled = false;
}

function copyEmail() {
  const subject = $('emailSubject').textContent;
  const body = $('emailBody').textContent;
  navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
  showToast('Email copied');
}

// ============================================================================
// Context Menu Actions
// ============================================================================
function handleContextMenuAction(message) {
  const actionMap = {
    'ml-summarize': { panel: 'quickTools', tool: 'bullets' },
    'ml-bullets': { panel: 'quickTools', tool: 'bullets' },
    'ml-translate': { panel: 'quickTools', tool: 'translate' },
    'ml-factcheck': { panel: 'quickTools', tool: 'factcheck' },
    'ml-explain': { panel: 'quickTools', tool: 'explain' },
    'ml-page-summary': { panel: 'pageDigest' },
    'ml-seo-analyze': { panel: 'seo' }
  };

  const action = actionMap[message.action];
  if (action) {
    state.selection = message.text || '';
    showPanel(action.panel);

    if (action.tool) {
      selectTool(action.tool);
      if (message.text) {
        $('toolInput').value = message.text;
        updateToolCharCount();
      }
    }
  }
}

// ============================================================================
// Utilities
// ============================================================================
function truncate(text, length) {
  if (!text) return '';
  return text.length > length ? text.substring(0, length) + '...' : text;
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function extractSources(response) {
  const sources = [];
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (chunks) {
    chunks.forEach(chunk => {
      if (chunk.web?.uri && chunk.web?.title) {
        sources.push({ title: chunk.web.title, uri: chunk.web.uri });
      }
    });
  }
  return sources.filter((v, i, a) => a.findIndex(t => t.uri === v.uri) === i);
}

function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('show'));

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ============================================================================
// Initialize
// ============================================================================
init();
