/**
 * ai-widget.js
 * Floating AI chat bubble embedded on every FLTH page (mounted from
 * app-shell.js, same pattern as the navbar/footer). Talks directly to
 * the FLTH AI Assistant app's guest SSE endpoint (AI/widget-stream.php) —
 * no login required, history kept in sessionStorage only.
 *
 * Fully self-contained: injects its own <style> and DOM on first call,
 * so no HTML file needs to be touched to add/remove/update the widget.
 */
import { t, onLangChange } from '../modules/i18n.js';
import { escapeHtml } from '../utils/sanitize.js';
import { AI_WIDGET_STREAM_URL } from '../config.js';

const HISTORY_KEY = 'flth_ai_widget_history';
const OPEN_KEY = 'flth_ai_widget_open';
const MAX_HISTORY_TURNS = 20;

let state = {
  messages: [], // { role: 'user' | 'assistant', content: string }
  streaming: false,
};

function loadHistory() {
  try {
    const raw = sessionStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory() {
  try {
    sessionStorage.setItem(HISTORY_KEY, JSON.stringify(state.messages.slice(-MAX_HISTORY_TURNS)));
  } catch {
    /* ignore quota errors — history is a nice-to-have, not critical */
  }
}

function injectStyles() {
  if (document.getElementById('ai-widget-styles')) return;

  const style = document.createElement('style');
  style.id = 'ai-widget-styles';
  style.textContent = `
    .ai-widget-launcher {
      position: fixed;
      inset-block-end: 24px;
      inset-inline-end: 24px;
      z-index: 999;
      width: 60px;
      height: 60px;
      border-radius: var(--radius-pill);
      border: none;
      background: linear-gradient(135deg, var(--accent), var(--accent-strong));
      color: var(--accent-contrast);
      box-shadow: var(--shadow-lg);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: transform var(--dur-base) var(--ease-spring), box-shadow var(--dur-base) var(--ease-out);
    }
    .ai-widget-launcher:hover { transform: translateY(-3px) scale(1.04); }
    .ai-widget-launcher svg { width: 26px; height: 26px; }
    .ai-widget-launcher .ai-widget-dot {
      position: absolute;
      top: 6px;
      inset-inline-end: 6px;
      width: 10px;
      height: 10px;
      border-radius: 999px;
      background: var(--success);
      border: 2px solid var(--bg-raised);
    }
    .ai-widget-launcher.is-hidden { transform: scale(0); opacity: 0; pointer-events: none; }

    .ai-widget-panel {
      position: fixed;
      inset-block-end: 24px;
      inset-inline-end: 24px;
      z-index: 1000;
      width: min(380px, calc(100vw - 32px));
      height: min(600px, calc(100vh - 100px));
      background: var(--panel);
      border: 1px solid var(--panel-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      opacity: 0;
      transform: translateY(16px) scale(.97);
      pointer-events: none;
      transition: opacity var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-spring);
    }
    .ai-widget-panel.is-open {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }

    .ai-widget-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      background: linear-gradient(135deg, var(--accent-tint), var(--bg-soft));
      border-bottom: 1px solid var(--panel-border);
      flex-shrink: 0;
    }
    .ai-widget-avatar {
      width: 38px;
      height: 38px;
      border-radius: 999px;
      background: linear-gradient(135deg, var(--accent), var(--accent-strong));
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--accent-contrast);
      flex-shrink: 0;
    }
    .ai-widget-avatar svg { width: 20px; height: 20px; }
    .ai-widget-heading { flex: 1; min-width: 0; }
    .ai-widget-heading h3 {
      margin: 0;
      font-family: var(--font-display);
      font-size: .98rem;
      color: var(--ink);
    }
    .ai-widget-status {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: .74rem;
      color: var(--ink-mute);
    }
    .ai-widget-status .dot {
      width: 7px;
      height: 7px;
      border-radius: 999px;
      background: var(--success);
      flex-shrink: 0;
    }
    .ai-widget-header-actions { display: flex; gap: 4px; flex-shrink: 0; }
    .ai-widget-icon-btn {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      background: transparent;
      color: var(--ink-mute);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out);
    }
    .ai-widget-icon-btn:hover { background: var(--bg-raised); color: var(--ink); }
    .ai-widget-icon-btn svg { width: 16px; height: 16px; }

    .ai-widget-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: var(--bg);
    }
    .ai-widget-msg { display: flex; gap: 8px; max-width: 90%; }
    .ai-widget-msg.user { align-self: flex-end; flex-direction: row-reverse; }
    .ai-widget-msg.assistant { align-self: flex-start; }
    .ai-widget-msg-avatar {
      width: 26px;
      height: 26px;
      border-radius: 999px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: .7rem;
    }
    .ai-widget-msg.assistant .ai-widget-msg-avatar {
      background: linear-gradient(135deg, var(--accent), var(--accent-strong));
      color: var(--accent-contrast);
    }
    .ai-widget-msg.user .ai-widget-msg-avatar {
      background: var(--bg-soft);
      color: var(--ink-soft);
    }
    .ai-widget-msg-avatar svg { width: 14px; height: 14px; }
    .ai-widget-bubble {
      padding: 9px 13px;
      border-radius: var(--radius-md);
      font-size: .87rem;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .ai-widget-msg.assistant .ai-widget-bubble {
      background: var(--bg-raised);
      border: 1px solid var(--panel-border);
      color: var(--ink);
      border-start-start-radius: 4px;
    }
    .ai-widget-msg.user .ai-widget-bubble {
      background: var(--ink);
      color: var(--bg);
      border-start-end-radius: 4px;
    }

    .ai-widget-typing { align-self: flex-start; display: flex; gap: 8px; }
    .ai-widget-typing-dots {
      display: flex;
      gap: 3px;
      align-items: center;
      background: var(--bg-raised);
      border: 1px solid var(--panel-border);
      padding: 10px 13px;
      border-radius: var(--radius-md);
      border-start-start-radius: 4px;
    }
    .ai-widget-typing-dots span {
      width: 5px;
      height: 5px;
      border-radius: 999px;
      background: var(--ink-mute);
      animation: ai-widget-bounce 1.1s infinite ease-in-out;
    }
    .ai-widget-typing-dots span:nth-child(2) { animation-delay: .15s; }
    .ai-widget-typing-dots span:nth-child(3) { animation-delay: .3s; }
    @keyframes ai-widget-bounce {
      0%, 60%, 100% { transform: translateY(0); opacity: .5; }
      30% { transform: translateY(-4px); opacity: 1; }
    }

    .ai-widget-form {
      display: flex;
      gap: 8px;
      padding: 12px;
      border-top: 1px solid var(--panel-border);
      background: var(--panel);
      flex-shrink: 0;
    }
    .ai-widget-input {
      flex: 1;
      resize: none;
      border: 1px solid var(--panel-border);
      background: var(--input-bg);
      color: var(--ink);
      border-radius: var(--radius-md);
      padding: 9px 12px;
      font-family: var(--font-body);
      font-size: .87rem;
      max-height: 90px;
      line-height: 1.4;
    }
    .ai-widget-input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
    .ai-widget-send {
      width: 38px;
      height: 38px;
      flex-shrink: 0;
      border: none;
      border-radius: 999px;
      background: linear-gradient(135deg, var(--accent), var(--accent-strong));
      color: var(--accent-contrast);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: transform var(--dur-fast) var(--ease-out);
    }
    .ai-widget-send:hover:not(:disabled) { transform: scale(1.06); }
    .ai-widget-send:disabled { opacity: .5; cursor: not-allowed; }
    .ai-widget-send svg { width: 16px; height: 16px; }

    .ai-widget-disclaimer {
      font-size: .68rem;
      color: var(--ink-mute);
      text-align: center;
      padding: 0 12px 10px;
      flex-shrink: 0;
    }

    @media (max-width: 480px) {
      .ai-widget-panel {
        inset-inline-end: 12px;
        inset-inline-start: 12px;
        inset-block-end: 12px;
        width: auto;
        height: min(72vh, 640px);
      }
      .ai-widget-launcher { inset-inline-end: 16px; inset-block-end: 16px; }
    }
  `;
  document.head.appendChild(style);
}

function robotIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="8" width="16" height="12" rx="3" stroke="currentColor" stroke-width="1.8"/><path d="M9 13v1.2M15 13v1.2M12 4v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="3.2" r="1.2" fill="currentColor"/></svg>`;
}
function userIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="3.4" stroke="currentColor" stroke-width="1.8"/><path d="M4.5 20c1.6-3.6 4.6-5.5 7.5-5.5s5.9 1.9 7.5 5.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
}
function closeIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
}
function refreshIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 12a9 9 0 0 1 15.3-6.4M21 12a9 9 0 0 1-15.3 6.4M3 5v5h5M21 19v-5h-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
function sendIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M22 2 11 13M22 2 15 22l-4-9-9-4 20-7Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`;
}

function renderMessageNode(msg) {
  const wrap = document.createElement('div');
  wrap.className = `ai-widget-msg ${msg.role === 'user' ? 'user' : 'assistant'}`;
  wrap.innerHTML = `
    <div class="ai-widget-msg-avatar">${msg.role === 'user' ? userIcon() : robotIcon()}</div>
    <div class="ai-widget-bubble"></div>
  `;
  // Set as text, not HTML — the streamed reply is untrusted content.
  wrap.querySelector('.ai-widget-bubble').textContent = msg.content;
  return wrap;
}

export function renderChatWidget() {
  if (document.getElementById('ai-widget-root')) return; // already mounted

  injectStyles();
  state.messages = loadHistory();

  const root = document.createElement('div');
  root.id = 'ai-widget-root';
  root.innerHTML = `
    <button type="button" class="ai-widget-launcher" id="aiWidgetLauncher" aria-label="${escapeHtml(t('aiWidget.launcherLabel'))}">
      ${robotIcon()}
      <span class="ai-widget-dot" aria-hidden="true"></span>
    </button>

    <section class="ai-widget-panel" id="aiWidgetPanel" role="dialog" aria-label="${escapeHtml(t('aiWidget.title'))}" aria-hidden="true">
      <header class="ai-widget-header">
        <div class="ai-widget-avatar">${robotIcon()}</div>
        <div class="ai-widget-heading">
          <h3>${escapeHtml(t('aiWidget.title'))}</h3>
          <div class="ai-widget-status"><span class="dot"></span><span>${escapeHtml(t('aiWidget.status'))}</span></div>
        </div>
        <div class="ai-widget-header-actions">
          <button type="button" class="ai-widget-icon-btn" id="aiWidgetReset" title="${escapeHtml(t('aiWidget.newChat'))}">${refreshIcon()}</button>
          <button type="button" class="ai-widget-icon-btn" id="aiWidgetClose" title="${escapeHtml(t('aiWidget.close'))}">${closeIcon()}</button>
        </div>
      </header>

      <div class="ai-widget-messages" id="aiWidgetMessages"></div>

      <form class="ai-widget-form" id="aiWidgetForm">
        <textarea
          class="ai-widget-input"
          id="aiWidgetInput"
          rows="1"
          maxlength="2000"
          placeholder="${escapeHtml(t('aiWidget.inputPlaceholder'))}"
          aria-label="${escapeHtml(t('aiWidget.inputPlaceholder'))}"
        ></textarea>
        <button type="submit" class="ai-widget-send" id="aiWidgetSend" aria-label="${escapeHtml(t('aiWidget.send'))}">${sendIcon()}</button>
      </form>
      <p class="ai-widget-disclaimer">${escapeHtml(t('aiWidget.disclaimer'))}</p>
    </section>
  `;
  document.body.appendChild(root);

  const launcher = root.querySelector('#aiWidgetLauncher');
  const panel = root.querySelector('#aiWidgetPanel');
  const messagesEl = root.querySelector('#aiWidgetMessages');
  const form = root.querySelector('#aiWidgetForm');
  const input = root.querySelector('#aiWidgetInput');
  const sendBtn = root.querySelector('#aiWidgetSend');
  const closeBtn = root.querySelector('#aiWidgetClose');
  const resetBtn = root.querySelector('#aiWidgetReset');

  function renderAllMessages() {
    messagesEl.innerHTML = '';
    if (state.messages.length === 0) {
      messagesEl.appendChild(renderMessageNode({ role: 'assistant', content: t('aiWidget.greeting') }));
    } else {
      state.messages.forEach((m) => messagesEl.appendChild(renderMessageNode(m)));
    }
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function openPanel() {
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    launcher.classList.add('is-hidden');
    sessionStorage.setItem(OPEN_KEY, '1');
    setTimeout(() => input.focus(), 150);
  }

  function closePanel() {
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    launcher.classList.remove('is-hidden');
    sessionStorage.removeItem(OPEN_KEY);
  }

  launcher.addEventListener('click', openPanel);
  closeBtn.addEventListener('click', closePanel);

  resetBtn.addEventListener('click', () => {
    if (state.streaming) return;
    state.messages = [];
    saveHistory();
    renderAllMessages();
  });

  function autoGrow() {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 90)}px`;
  }
  input.addEventListener('input', autoGrow);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  async function sendMessage(text) {
    state.messages.push({ role: 'user', content: text });
    saveHistory();
    renderAllMessages();

    state.streaming = true;
    sendBtn.disabled = true;

    const typingNode = document.createElement('div');
    typingNode.className = 'ai-widget-typing';
    typingNode.innerHTML = `<div class="ai-widget-msg-avatar" style="background:linear-gradient(135deg, var(--accent), var(--accent-strong)); color:var(--accent-contrast); display:flex; align-items:center; justify-content:center;">${robotIcon()}</div><div class="ai-widget-typing-dots"><span></span><span></span><span></span></div>`;
    messagesEl.appendChild(typingNode);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    let assistantText = '';
    let bubbleEl = null;

    try {
      const historyForRequest = state.messages.slice(0, -1).slice(-10);
      const response = await fetch(AI_WIDGET_STREAM_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: historyForRequest }),
      });

      if (!response.ok || !response.body) {
        throw new Error('bad_response');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // Minimal SSE parser: events arrive as "event: X\ndata: {...}\n\n"
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() ?? '';

        for (const chunk of chunks) {
          const eventMatch = chunk.match(/^event:\s*(.+)$/m);
          const dataMatch = chunk.match(/^data:\s*(.+)$/m);
          if (!dataMatch) continue;

          let payload;
          try {
            payload = JSON.parse(dataMatch[1]);
          } catch {
            continue;
          }

          const eventName = eventMatch ? eventMatch[1].trim() : 'message';

          if (eventName === 'chunk' && typeof payload.text === 'string') {
            if (!bubbleEl) {
              typingNode.remove();
              const node = renderMessageNode({ role: 'assistant', content: '' });
              bubbleEl = node.querySelector('.ai-widget-bubble');
              messagesEl.appendChild(node);
            }
            assistantText += payload.text;
            bubbleEl.textContent = assistantText;
            messagesEl.scrollTop = messagesEl.scrollHeight;
          } else if (eventName === 'error') {
            throw new Error(payload.error || 'stream_error');
          }
        }
      }

      if (!assistantText) {
        assistantText = t('aiWidget.errorGeneric');
        if (!bubbleEl) {
          typingNode.remove();
          const node = renderMessageNode({ role: 'assistant', content: assistantText });
          messagesEl.appendChild(node);
        }
      }

      state.messages.push({ role: 'assistant', content: assistantText });
      saveHistory();
    } catch {
      typingNode.remove();
      if (!bubbleEl) {
        const node = renderMessageNode({ role: 'assistant', content: t('aiWidget.errorGeneric') });
        messagesEl.appendChild(node);
      }
    } finally {
      state.streaming = false;
      sendBtn.disabled = false;
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || state.streaming) return;
    input.value = '';
    autoGrow();
    sendMessage(text);
  });

  renderAllMessages();
  onLangChange(() => {
    // Re-render static chrome strings on language switch; message history stays as-is.
    root.querySelector('#aiWidgetLauncher').setAttribute('aria-label', t('aiWidget.launcherLabel'));
    root.querySelector('.ai-widget-heading h3').textContent = t('aiWidget.title');
    root.querySelector('.ai-widget-status span:last-child').textContent = t('aiWidget.status');
    input.setAttribute('placeholder', t('aiWidget.inputPlaceholder'));
  });

  if (sessionStorage.getItem(OPEN_KEY) === '1') {
    openPanel();
  }
}
