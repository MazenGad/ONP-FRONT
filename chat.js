const ChatApp = (() => {
  const API_BASE = 'http://localhost:5180/api/Chat';
  const POLL_MS = 6000;
  const state = {
    token: null,
    user: null,
    conversations: [],
    active: null,
    messages: [],
    pendingTarget: null,
    pollTimer: null,
  };

  const elements = {};

  function init() {
    cacheDom();
    bindUI();
    ensureAuth();
    hydrateTarget();
    loadConversations();
    startPolling();
  }

  function cacheDom() {
    elements.conversationList = document.getElementById('conversation-list');
    elements.conversationCount = document.getElementById('conversation-count');
    elements.refreshButton = document.getElementById('refresh-conversations');
    elements.partnerName = document.getElementById('partner-name');
    elements.partnerCourse = document.getElementById('partner-course');
    elements.chatStatus = document.getElementById('chat-status');
    elements.messageList = document.getElementById('message-list');
    elements.emptyState = document.getElementById('empty-state');
    elements.messageForm = document.getElementById('message-form');
    elements.messageInput = document.getElementById('message-input');
    elements.alert = document.getElementById('chat-alert');
  }

  function bindUI() {
    elements.refreshButton.addEventListener('click', () => loadConversations(true));
    elements.messageForm.addEventListener('submit', handleSend);
  }

  function ensureAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (!token || !user) {
      window.location.href = 'login.html';
      return;
    }
    try {
      state.user = JSON.parse(user);
    } catch {
      window.location.href = 'login.html';
      return;
    }
    state.token = token;
  }

  function hydrateTarget() {
    const raw = localStorage.getItem('chat_target');
    if (!raw) return;
    try {
      state.pendingTarget = JSON.parse(raw);
      localStorage.removeItem('chat_target');
    } catch {
      localStorage.removeItem('chat_target');
    }
  }

  function startPolling() {
    stopPolling();
    state.pollTimer = setInterval(async () => {
      await loadConversations();
      if (state.active) {
        await loadMessages(state.active.otherUserId, state.active.courseId, true);
      }
    }, POLL_MS);
  }

  function stopPolling() {
    if (state.pollTimer) {
      clearInterval(state.pollTimer);
      state.pollTimer = null;
    }
  }

  async function request(path, options = {}) {
    const headers = options.headers ? { ...options.headers } : {};
    headers['Authorization'] = `Bearer ${state.token}`;
    if (!headers['Content-Type'] && !options.skipJson) {
      headers['Content-Type'] = 'application/json';
    }
    const response = await fetch(`${API_BASE}/${path}`, { ...options, headers });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || response.statusText);
    }
    if (response.status === 204) return null;
    return response.json();
  }

  async function loadConversations(force) {
    try {
      elements.chatStatus.textContent = 'Syncing';
      const data = await request('conversations');
      state.conversations = Array.isArray(data) ? data : [];
      renderConversations();
      elements.chatStatus.textContent = `Updated ${new Date().toLocaleTimeString()}`;
      if (state.pendingTarget) {
        openPendingTarget();
      } else if (force && state.active) {
        const match = locateConversation(state.active.otherUserId, state.active.courseId);
        if (match) {
          state.active = match;
          await loadMessages(match.otherUserId, match.courseId);
        }
      }
    } catch (error) {
      showAlert(error.message, true);
      elements.chatStatus.textContent = 'Offline';
    }
  }

  function renderConversations() {
    elements.conversationList.innerHTML = '';
    if (!state.conversations.length) {
      elements.conversationCount.textContent = 'No active threads';
      return;
    }
    elements.conversationCount.textContent = `${state.conversations.length} active threads`;
    state.conversations.forEach(conversation => {
      const item = document.createElement('li');
      item.className = 'conversation-item';
      if (state.active && conversation.otherUserId === state.active.otherUserId && conversation.courseId === state.active.courseId) {
        item.classList.add('active');
      }
      item.dataset.userId = conversation.otherUserId;
      item.dataset.courseId = conversation.courseId;

      const avatar = document.createElement('img');
      avatar.src = conversation.otherUserProfileImage || 'images/avatar.jpg';
      avatar.alt = conversation.otherUserName || 'User';

      const meta = document.createElement('div');
      meta.className = 'conversation-meta';
      const name = document.createElement('strong');
      name.textContent = conversation.otherUserName || 'Unknown user';
      const subtitle = document.createElement('span');
      subtitle.textContent = `${conversation.courseTitle || 'Course'} • ${conversation.lastMessageTime ? new Date(conversation.lastMessageTime).toLocaleString() : 'No messages yet'}`;
      const preview = document.createElement('span');
      preview.textContent = conversation.lastMessage || '';
      preview.style.fontSize = '0.82rem';
      preview.style.color = '#94a3b8';
      preview.style.whiteSpace = 'nowrap';
      preview.style.overflow = 'hidden';
      preview.style.textOverflow = 'ellipsis';

      meta.appendChild(name);
      meta.appendChild(subtitle);
      meta.appendChild(preview);

      item.appendChild(avatar);
      item.appendChild(meta);

      if (conversation.unreadCount > 0) {
        const dot = document.createElement('span');
        dot.className = 'unread-dot';
        item.appendChild(dot);
      }

      item.addEventListener('click', () => selectConversation(conversation));
      elements.conversationList.appendChild(item);
    });
  }

  function locateConversation(otherUserId, courseId) {
    return state.conversations.find(c => c.otherUserId === otherUserId && c.courseId === courseId);
  }

  async function selectConversation(conversation) {
    state.active = conversation;
    elements.partnerName.textContent = conversation.otherUserName || 'Conversation';
    elements.partnerCourse.textContent = conversation.courseTitle ? `Course #${conversation.courseId} • ${conversation.courseTitle}` : `Course #${conversation.courseId}`;
    highlightActiveConversation();
    await loadMessages(conversation.otherUserId, conversation.courseId);
  }

  function highlightActiveConversation() {
    document.querySelectorAll('.conversation-item').forEach(item => {
      item.classList.remove('active');
      if (state.active && item.dataset.userId === state.active.otherUserId && Number(item.dataset.courseId) === Number(state.active.courseId)) {
        item.classList.add('active');
      }
    });
  }

  async function loadMessages(otherUserId, courseId, silent) {
    if (!otherUserId || !courseId) return;
    try {
      if (!silent) elements.chatStatus.textContent = 'Loading messages';
      const messages = await request(`messages/${encodeURIComponent(otherUserId)}/${encodeURIComponent(courseId)}`);
      state.messages = Array.isArray(messages) ? messages : [];
      renderMessages();
      if (!silent) elements.chatStatus.textContent = `Last sync ${new Date().toLocaleTimeString()}`;
    } catch (error) {
      showAlert(error.message, true);
      if (!silent) elements.chatStatus.textContent = 'Unable to load messages';
    }
  }

  function renderMessages() {
    elements.messageList.innerHTML = '';
    if (!state.messages.length) {
      elements.emptyState.style.display = 'flex';
      return;
    }
    elements.emptyState.style.display = 'none';
    state.messages.forEach(message => {
      const bubble = document.createElement('div');
      bubble.className = `message ${message.isFromCurrentUser ? 'self' : 'other'}`;
      bubble.textContent = message.content;
      const time = document.createElement('time');
      time.textContent = new Date(message.sentAt).toLocaleString();
      bubble.appendChild(time);
      elements.messageList.appendChild(bubble);
    });
    elements.messageList.scrollTop = elements.messageList.scrollHeight;
  }

  async function handleSend(event) {
    event.preventDefault();
    const content = elements.messageInput.value.trim();
    if (!content) return;
    if (!state.active) {
      showAlert('Select a conversation first', true);
      return;
    }
    try {
      elements.chatStatus.textContent = 'Sending';
      await request('send-message', {
        method: 'POST',
        body: JSON.stringify({
          receiverId: state.active.otherUserId,
          courseId: state.active.courseId,
          content,
        }),
      });
      elements.messageInput.value = '';
      await loadMessages(state.active.otherUserId, state.active.courseId);
      await loadConversations();
      showAlert('Message sent', false);
    } catch (error) {
      showAlert(error.message, true);
      elements.chatStatus.textContent = 'Send failed';
    }
  }

  function showAlert(message, isError) {
    elements.alert.textContent = message;
    elements.alert.classList.remove('error', 'info', 'show');
    elements.alert.classList.add(isError ? 'error' : 'info');
    elements.alert.classList.add('show');
    setTimeout(() => elements.alert.classList.remove('show'), 4000);
  }

  function openPendingTarget() {
    const target = state.pendingTarget;
    if (!target) return;
    const match = locateConversation(target.otherUserId, Number(target.courseId));
    if (match) {
      selectConversation(match);
      state.pendingTarget = null;
      return;
    }
    state.active = {
      otherUserId: target.otherUserId,
      otherUserName: target.userName || 'Conversation',
      courseId: Number(target.courseId),
      courseTitle: target.courseTitle || '',
    };
    elements.partnerName.textContent = state.active.otherUserName;
    elements.partnerCourse.textContent = state.active.courseTitle ? `Course #${state.active.courseId} • ${state.active.courseTitle}` : `Course #${state.active.courseId}`;
    elements.emptyState.style.display = 'flex';
    state.pendingTarget = null;
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', ChatApp.init);

