/**
 * Enhanced Chat Widget v2.0 for Course Details Page
 * Uses ChatEngine for improved functionality and reliability
 * Embeds a floating chat interface for student-instructor communication
 */

class ChatWidget {
    constructor(config = {}) {
        this.config = {
            courseId: config.courseId,
            instructorId: config.instructorId,
            instructorName: config.instructorName,
            ...config
        };

        this.isOpen = false;
        this.messages = [];
        this.unreadCount = 0;

        // Initialize chat engine
        this.chatEngine = new ChatEngine({
            apiBase: config.apiBase || 'https://mazengad6-001-site1.rtempurl.com/api/Chat',
            wsBase: config.wsBase || 'wss://mazengad6-001-site1.rtempurl.com/ws/chat',
            userApiBase: config.userApiBase || 'https://mazengad6-001-site1.rtempurl.com/api'
        });

        this.init();
    }

    init() {
        this.createWidget();
        this.setupEventHandlers();
        this.setupChatEngineHandlers();
        this.resolveInstructorId();
    }

    setupChatEngineHandlers() {
        this.chatEngine.on('messageReceived', (messageData) => {
            if (messageData.courseId == this.config.courseId) {
                this.addMessageToUI(messageData.content, false, messageData.sentAt);
                if (!this.isOpen) {
                    this.updateBadge();
                }
            }
        });

        this.chatEngine.on('messageSent', (data) => {
            if (data.optimistic) {
                // Message already in UI from optimistic update
                this.updateMessageStatus(data.message.id, 'pending');
            } else {
                // Message confirmed by server
                this.updateMessageStatus(data.message.id, 'sent');
            }
        });

        this.chatEngine.on('messageError', (data) => {
            this.updateMessageStatus(data.messageId, data.status);
            if (data.status === 'failed') {
                this.addRetryButton(data.messageId);
            }
        });

        this.chatEngine.on('connectionChanged', (data) => {
            this.updateConnectionStatus(data.status, data.message);
        });
    }

    async resolveInstructorId() {
        if (!this.config.instructorId && this.config.instructorName) {
            try {
                const instructor = await this.chatEngine.resolveUser(
                    this.config.instructorName,
                    this.config.courseId
                );
                this.config.instructorId = instructor.id;
                console.log('Resolved instructor ID:', this.config.instructorId);
            } catch (error) {
                console.error('Failed to resolve instructor ID:', error);
            }
        }
    }

    createWidget() {
        // Create widget HTML
        const widgetHTML = `
            <div id="chat-widget" class="chat-widget">
                <div id="chat-toggle" class="chat-toggle">
                    <i class="fas fa-comments"></i>
                    <span class="chat-badge" id="chat-badge" style="display: none;">0</span>
                </div>
                
                <div id="chat-window" class="chat-window" style="display: none;">
                    <div class="chat-header">
                        <div class="chat-header-info">
                            <i class="fas fa-user-circle"></i>
                            <span>${this.config.instructorName || 'Instructor'}</span>
                        </div>
                        <button id="chat-close" class="chat-close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div id="chat-messages" class="chat-messages">
                        <div class="chat-welcome">
                            <p>👋 Start a conversation with your instructor!</p>
                        </div>
                    </div>
                    
                    <div class="chat-input-container">
                        <input type="text" id="chat-input" placeholder="Type your message..." />
                        <button id="chat-send">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add CSS
        const widgetCSS = `
            <style>
                .chat-widget {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    z-index: 10000;
                    font-family: 'Segoe UI', sans-serif;
                }

                .chat-toggle {
                    width: 60px;
                    height: 60px;
                    background: #27ae60;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 24px;
                    cursor: pointer;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    transition: all 0.3s ease;
                    position: relative;
                }

                .chat-toggle:hover {
                    background: #1e874b;
                    transform: scale(1.1);
                }

                .chat-badge {
                    position: absolute;
                    top: -5px;
                    right: -5px;
                    background: #e74c3c;
                    color: white;
                    border-radius: 50%;
                    width: 20px;
                    height: 20px;
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                }

                .chat-window {
                    position: absolute;
                    bottom: 80px;
                    right: 0;
                    width: 350px;
                    height: 450px;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 8px 25px rgba(0,0,0,0.15);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    animation: slideUp 0.3s ease;
                }

                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .chat-header {
                    background: #2c3e50;
                    color: white;
                    padding: 15px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .chat-header-info {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-weight: 500;
                }

                .chat-close {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 16px;
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 4px;
                }

                .chat-close:hover {
                    background: rgba(255,255,255,0.1);
                }

                .chat-messages {
                    flex: 1;
                    padding: 15px;
                    overflow-y: auto;
                    background: #f8f9fa;
                }

                .chat-welcome {
                    text-align: center;
                    color: #666;
                    font-size: 14px;
                    margin-top: 50px;
                }

                .chat-message {
                    margin-bottom: 12px;
                    display: flex;
                    flex-direction: column;
                }

                .chat-message.sent {
                    align-items: flex-end;
                }

                .chat-message.received {
                    align-items: flex-start;
                }

                .message-bubble {
                    max-width: 80%;
                    padding: 10px 14px;
                    border-radius: 18px;
                    font-size: 14px;
                    line-height: 1.4;
                    position: relative;
                }

                .chat-message.sent .message-bubble {
                    background: #27ae60;
                    color: white;
                }

                .chat-message.received .message-bubble {
                    background: white;
                    color: #333;
                    border: 1px solid #e1e8ed;
                }

                .message-time {
                    font-size: 11px;
                    color: #999;
                    margin-top: 4px;
                }

                .message-status {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    display: inline-block;
                    margin-left: 6px;
                }

                .status-pending { background: #fbbf24; }
                .status-sent { background: #10b981; }
                .status-failed { background: #ef4444; }

                .retry-btn {
                    background: #ef4444;
                    color: white;
                    border: none;
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-size: 10px;
                    cursor: pointer;
                    margin-left: 8px;
                }

                .retry-btn:hover {
                    background: #dc2626;
                }

                .chat-input-container {
                    padding: 15px;
                    background: white;
                    border-top: 1px solid #e1e8ed;
                    display: flex;
                    gap: 10px;
                }

                .chat-input-container input {
                    flex: 1;
                    padding: 10px 14px;
                    border: 1px solid #e1e8ed;
                    border-radius: 20px;
                    outline: none;
                    font-size: 14px;
                }

                .chat-input-container input:focus {
                    border-color: #27ae60;
                }

                .chat-input-container button {
                    width: 40px;
                    height: 40px;
                    background: #27ae60;
                    color: white;
                    border: none;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background 0.2s;
                }

                .chat-input-container button:hover {
                    background: #1e874b;
                }

                .chat-input-container button:disabled {
                    background: #bdc3c7;
                    cursor: not-allowed;
                }

                @media (max-width: 480px) {
                    .chat-window {
                        width: calc(100vw - 40px);
                        height: calc(100vh - 140px);
                        bottom: 80px;
                        right: 20px;
                    }
                }
            </style>
        `;

        // Inject into page
        document.head.insertAdjacentHTML('beforeend', widgetCSS);
        document.body.insertAdjacentHTML('beforeend', widgetHTML);
    }

    setupEventHandlers() {
        const toggle = document.getElementById('chat-toggle');
        const close = document.getElementById('chat-close');
        const input = document.getElementById('chat-input');
        const send = document.getElementById('chat-send');
        const window = document.getElementById('chat-window');

        toggle.addEventListener('click', () => this.toggleWidget());
        close.addEventListener('click', () => this.closeWidget());
        send.addEventListener('click', () => this.sendMessage());

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });

        // Load existing conversation when opened
        toggle.addEventListener('click', () => {
            if (!this.isOpen) this.loadConversation();
        });
    }

    toggleWidget() {
        const window = document.getElementById('chat-window');
        this.isOpen = !this.isOpen;
        window.style.display = this.isOpen ? 'flex' : 'none';

        if (this.isOpen) {
            document.getElementById('chat-input').focus();
            this.markAsRead();
        }
    }

    closeWidget() {
        this.isOpen = false;
        document.getElementById('chat-window').style.display = 'none';
    }

    async loadConversation() {
        if (!this.config.instructorId) {
            await this.resolveInstructorId();
        }

        if (!this.config.instructorId) {
            console.error('Cannot load conversation: instructor ID not available');
            return;
        }

        try {
            const messages = await this.chatEngine.loadMessages(
                this.config.instructorId,
                this.config.courseId
            );
            this.renderMessages(messages);
        } catch (error) {
            console.error('Failed to load conversation:', error);
            this.showError('Failed to load conversation');
        }
    }

    renderMessages(messages) {
        const container = document.getElementById('chat-messages');
        container.innerHTML = '';

        if (messages.length === 0) {
            container.innerHTML = '<div class="chat-welcome"><p>👋 Start a conversation with your instructor!</p></div>';
            return;
        }

        messages.forEach(msg => {
            this.addMessageToUI(msg.content, msg.isFromCurrentUser, msg.sentAt);
        });

        container.scrollTop = container.scrollHeight;
    }

    addMessageToUI(content, isSent, timestamp, status = 'sent', messageId = null) {
        const container = document.getElementById('chat-messages');
        const welcome = container.querySelector('.chat-welcome');
        if (welcome) welcome.remove();

        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${isSent ? 'sent' : 'received'}`;
        if (messageId) {
            messageDiv.setAttribute('data-message-id', messageId);
        }

        const timeStr = timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'now';

        messageDiv.innerHTML = `
            <div class="message-bubble">${this.escapeHtml(content)}</div>
            <div class="message-time">
                ${timeStr}
                ${isSent ? `<span class="message-status status-${status}"></span>` : ''}
            </div>
        `;

        container.appendChild(messageDiv);
        container.scrollTop = container.scrollHeight;
    }

    updateMessageStatus(messageId, status) {
        const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageEl) {
            const statusEl = messageEl.querySelector('.message-status');
            if (statusEl) {
                statusEl.className = `message-status status-${status}`;
            }
        }
    }

    addRetryButton(messageId) {
        const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageEl && !messageEl.querySelector('.retry-btn')) {
            const retryBtn = document.createElement('button');
            retryBtn.className = 'retry-btn';
            retryBtn.innerHTML = '↻';
            retryBtn.title = 'Retry sending message';
            retryBtn.onclick = () => this.retryMessage(messageId);
            messageEl.querySelector('.message-time').appendChild(retryBtn);
        }
    }

    async retryMessage(messageId) {
        const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
        if (!messageEl) return;

        const content = messageEl.querySelector('.message-bubble').textContent;
        const retryBtn = messageEl.querySelector('.retry-btn');
        if (retryBtn) retryBtn.remove();

        this.updateMessageStatus(messageId, 'pending');

        try {
            const newMessageId = await this.chatEngine.sendMessage(
                this.config.instructorId,
                this.config.courseId,
                content
            );
            messageEl.setAttribute('data-message-id', newMessageId);
        } catch (error) {
            this.updateMessageStatus(messageId, 'failed');
            this.addRetryButton(messageId);
        }
    }

    updateConnectionStatus(status, message) {
        // Could add a small connection indicator to the widget header
        console.log(`Chat widget connection: ${status} - ${message}`);
    }

    showError(message) {
        const container = document.getElementById('chat-messages');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'chat-error';
        errorDiv.style.cssText = 'color: #e74c3c; text-align: center; padding: 10px; font-size: 12px;';
        errorDiv.textContent = message;
        container.appendChild(errorDiv);

        // Remove error after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }

    async sendMessage() {
        const input = document.getElementById('chat-input');
        const send = document.getElementById('chat-send');
        const content = input.value.trim();

        if (!content) return;

        if (!this.config.instructorId) {
            await this.resolveInstructorId();
        }

        if (!this.config.instructorId) {
            this.showError('Cannot send message: instructor not found');
            return;
        }

        // Optimistic UI update
        const tempMessageId = `temp_${Date.now()}`;
        this.addMessageToUI(content, true, Date.now(), 'pending', tempMessageId);
        input.value = '';
        send.disabled = true;

        try {
            // Send using chat engine
            const messageId = await this.chatEngine.sendMessage(
                this.config.instructorId,
                this.config.courseId,
                content
            );

            // Update the temporary message with real ID
            const tempEl = document.querySelector(`[data-message-id="${tempMessageId}"]`);
            if (tempEl) {
                tempEl.setAttribute('data-message-id', messageId);
            }

        } catch (error) {
            console.error('Send error:', error);
            this.updateMessageStatus(tempMessageId, 'failed');
            this.addRetryButton(tempMessageId);
            this.showError(`Failed to send message: ${error.message}`);
        } finally {
            send.disabled = false;
            input.focus();
        }
    }

    // WebSocket connection is now handled by ChatEngine
    // This method is kept for compatibility but does nothing

    updateBadge() {
        if (!this.isOpen) {
            const badge = document.getElementById('chat-badge');
            const current = parseInt(badge.textContent) || 0;
            badge.textContent = current + 1;
            badge.style.display = 'flex';
        }
    }

    markAsRead() {
        const badge = document.getElementById('chat-badge');
        badge.style.display = 'none';
        badge.textContent = '0';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Auto-initialize if course data is available
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on course details page
    const courseId = new URLSearchParams(window.location.search).get('id');
    if (courseId && window.location.pathname.includes('course-details-enrolled')) {
        // Wait for course data to load, then initialize widget
        setTimeout(() => {
            const instructorName = document.getElementById('course-instructor')?.textContent;
            if (instructorName) {
                window.chatWidget = new ChatWidget({
                    courseId: courseId,
                    instructorName: instructorName,
                    // instructorId will be set when course data loads
                });
            }
        }, 2000);
    }
});