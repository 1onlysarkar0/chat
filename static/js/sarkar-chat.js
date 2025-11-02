// SARKAR AI - Modern Chat Interface JavaScript
document.addEventListener('DOMContentLoaded', function () {
    initializeSarkarInterface();
});

let currentChatId = null;
let isLoading = false;
let sidebarExpanded = false;

// Persist and restore last opened chat and view/scroll to avoid flicker on reload
const LAST_CHAT_KEY = 'sarkar_last_chat_id';
const LAST_VIEW_KEY = 'sarkar_last_view'; // 'chat' | 'welcome'
const LAST_MSG_SCROLL_KEY = 'sarkar_last_msg_scroll';
const LAST_WIN_SCROLL_KEY = 'sarkar_last_win_scroll';
function getLastChatId() {
    try { return parseInt(sessionStorage.getItem(LAST_CHAT_KEY)) || null; } catch (_) { return null; }
}
function setLastChatId(chatId) {
    try { if (chatId) { sessionStorage.setItem(LAST_CHAT_KEY, String(chatId)); } } catch (_) { }
}
function clearLastChatId() {
    try { sessionStorage.removeItem(LAST_CHAT_KEY); } catch (_) { }
}

function setLastView(view) {
    try { sessionStorage.setItem(LAST_VIEW_KEY, view); } catch (_) { }
}
function getLastView() {
    try { return sessionStorage.getItem(LAST_VIEW_KEY) || null; } catch (_) { return null; }
}

function setLastMsgScroll(value) {
    try { sessionStorage.setItem(LAST_MSG_SCROLL_KEY, String(value || 0)); } catch (_) { }
}
function getLastMsgScroll() {
    try {
        const v = sessionStorage.getItem(LAST_MSG_SCROLL_KEY);
        return v === null ? null : parseInt(v);
    } catch (_) { return null; }
}

function setLastWinScroll(value) {
    try { sessionStorage.setItem(LAST_WIN_SCROLL_KEY, String(value || 0)); } catch (_) { }
}
function getLastWinScroll() {
    try {
        const v = sessionStorage.getItem(LAST_WIN_SCROLL_KEY);
        return v === null ? null : parseInt(v);
    } catch (_) { return null; }
}

function initializeSarkarInterface() {
    // Initialize event listeners
    initializeEventListeners();

    // Auto-resize textareas
    autoResizeTextareas();

    // Setup enhanced scroll detection
    setupScrollDetection();

    // Restore last opened chat and view (prevents welcome flicker on refresh)
    const storedChatId = getLastChatId();
    const storedView = getLastView();
    const firstChat = document.querySelector('.chat-history-item');
    if (!currentChatId && (storedChatId || firstChat)) {
        if (storedView === 'welcome' && !storedChatId) {
            switchToWelcomeView();
        } else {
            switchToChatView();
            const chatIdToLoad = storedChatId || parseInt(firstChat?.dataset.chatId);
            if (chatIdToLoad) {
                loadChat(chatIdToLoad);
            }
        }
    }

    // Save scroll state
    const messagesContainer = document.getElementById('messagesContainer');
    if (messagesContainer) {
        messagesContainer.addEventListener('scroll', function () {
            setLastMsgScroll(this.scrollTop);
        }, { passive: true });
    }
    window.addEventListener('scroll', function () {
        setLastWinScroll(window.scrollY || 0);
    }, { passive: true });
    window.addEventListener('beforeunload', function () {
        const mc = document.getElementById('messagesContainer');
        if (mc) setLastMsgScroll(mc.scrollTop);
        setLastWinScroll(window.scrollY || 0);
    });

    // Initialize sidebar state
    initializeSidebar();
}

function initializeEventListeners() {
    // Sidebar toggle functionality
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarToggleIcon = document.getElementById('sidebarToggleIcon');
    const sidebar = document.getElementById('sidebar');

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function () {
            toggleSidebar();
        });
    }

    if (sidebarToggleIcon && sidebar) {
        sidebarToggleIcon.addEventListener('click', function () {
            toggleSidebar();
        });
    }

    // New chat button
    const newChatBtn = document.getElementById('newChatBtn');
    if (newChatBtn) {
        newChatBtn.addEventListener('click', function () {
            newChat();
            closePanels();
        });
    }

    // Chat history button
    const historyBtn = document.getElementById('historyBtn');
    if (historyBtn) {
        historyBtn.addEventListener('click', function () {
            toggleHistoryPanel();
        });
    }

    // Settings button
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', function () {
            toggleSettingsPanel();
        });
    }

    // Delete button
    const deleteBtn = document.getElementById('deleteBtn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', function () {
            showDeleteOptionsModal();
        });
    }

    // Panel close buttons
    const closePanelBtn = document.getElementById('closePanelBtn');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');

    if (closePanelBtn) {
        closePanelBtn.addEventListener('click', function () {
            hideHistoryPanel();
        });
    }

    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', function () {
            hideSettingsPanel();
        });
    }

    // Main input handling
    const mainInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');

    if (mainInput && sendBtn) {
        mainInput.addEventListener('input', function () {
            const hasText = this.value.trim().length > 0;
            sendBtn.disabled = !hasText;
        });

        mainInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!sendBtn.disabled && !isLoading) {
                    sendMessage(this.value.trim());
                }
            }
        });

        sendBtn.addEventListener('click', function () {
            if (!this.disabled && !isLoading) {
                sendMessage(mainInput.value.trim());
            }
        });
    }

    // Chat input handling
    const chatInput = document.getElementById('chatInput');
    const sendChatBtn = document.getElementById('sendChatBtn');

    if (chatInput && sendChatBtn) {
        chatInput.addEventListener('input', function () {
            const hasText = this.value.trim().length > 0;
            sendChatBtn.disabled = !hasText;
        });

        chatInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!sendChatBtn.disabled && !isLoading) {
                    sendMessage(this.value.trim());
                }
            }
        });

        sendChatBtn.addEventListener('click', function () {
            if (!this.disabled && !isLoading) {
                sendMessage(chatInput.value.trim());
            }
        });
    }

    // User profile button
    const userProfileBtn = document.getElementById('userProfileBtn');
    const userProfileBtnHeader = document.getElementById('userProfileBtnHeader');
    const profileDropdown = document.getElementById('profileDropdown');

    if (userProfileBtn && profileDropdown) {
        userProfileBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            toggleProfileDropdown();
        });
    }
    if (userProfileBtnHeader && profileDropdown) {
        userProfileBtnHeader.addEventListener('click', function (e) {
            e.stopPropagation();
            toggleProfileDropdown();
        });
    }
    if (profileDropdown) {
        // Close dropdown when clicking outside
        document.addEventListener('click', function () {
            hideProfileDropdown();
        });
        profileDropdown.addEventListener('click', function (e) {
            e.stopPropagation();
        });
    }

    // Settings menu item
    const settingsMenuItem = document.getElementById('settingsMenuItem');
    if (settingsMenuItem) {
        settingsMenuItem.addEventListener('click', function () {
            hideProfileDropdown();
            toggleSettingsPanel();
        });
    }

    // Chat history items
    document.addEventListener('click', function (e) {
        if (e.target.closest('.chat-history-item') && !e.target.closest('.delete-chat-btn')) {
            const chatItem = e.target.closest('.chat-history-item');
            loadChat(parseInt(chatItem.dataset.chatId));
        }

        if (e.target.closest('.delete-chat-btn')) {
            const chatId = parseInt(e.target.closest('.delete-chat-btn').dataset.chatId);
            deleteChat(chatId);
        }
    });

    // Suggestion buttons
    document.addEventListener('click', function (e) {
        if (e.target.closest('.suggestion-btn')) {
            const suggestion = e.target.closest('.suggestion-btn').dataset.suggestion;
            const inputText = `Help me with ${suggestion.toLowerCase()}`;

            const mainInput = document.getElementById('messageInput');
            const chatInput = document.getElementById('chatInput');

            if (mainInput && mainInput.offsetParent !== null) {
                mainInput.value = inputText;
                mainInput.focus();
                document.getElementById('sendBtn').disabled = false;
            } else if (chatInput && chatInput.offsetParent !== null) {
                chatInput.value = inputText;
                chatInput.focus();
                document.getElementById('sendChatBtn').disabled = false;
            }
        }
    });

    // Settings form handling
    const displayNameSetting = document.getElementById('displayNameSetting');
    const themeSetting = document.getElementById('themeSetting');

    if (displayNameSetting) {
        displayNameSetting.addEventListener('change', function () {
            saveDisplayName(this.value);
        });
    }

    if (themeSetting) {
        themeSetting.addEventListener('change', function () {
            saveTheme(this.value);
        });
    }

    // Password change modal
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    const passwordModal = document.getElementById('passwordModal');
    const closePasswordModal = document.getElementById('closePasswordModal');
    const passwordModalOverlay = document.getElementById('passwordModalOverlay');
    const cancelPasswordBtn = document.getElementById('cancelPasswordBtn');
    const savePasswordBtn = document.getElementById('savePasswordBtn');

    if (changePasswordBtn && passwordModal) {
        changePasswordBtn.addEventListener('click', function () {
            showPasswordModal();
        });
    }

    if (closePasswordModal) {
        closePasswordModal.addEventListener('click', function () {
            hidePasswordModal();
        });
    }

    if (passwordModalOverlay) {
        passwordModalOverlay.addEventListener('click', function () {
            hidePasswordModal();
        });
    }

    if (cancelPasswordBtn) {
        cancelPasswordBtn.addEventListener('click', function () {
            hidePasswordModal();
        });
    }

    if (savePasswordBtn) {
        savePasswordBtn.addEventListener('click', function () {
            savePassword();
        });
    }

    // Close panels when clicking outside
    document.addEventListener('click', function (e) {
        const historyPanel = document.getElementById('chatHistoryPanel');
        const settingsPanel = document.getElementById('settingsPanel');
        const historyBtn = document.getElementById('historyBtn');
        const settingsBtn = document.getElementById('settingsBtn');

        if (historyPanel && historyPanel.classList.contains('show')) {
            if (!historyPanel.contains(e.target) && !historyBtn.contains(e.target)) {
                hideHistoryPanel();
            }
        }

        if (settingsPanel && settingsPanel.classList.contains('show')) {
            if (!settingsPanel.contains(e.target) && !settingsBtn.contains(e.target)) {
                hideSettingsPanel();
            }
        }
    });

    // Delegated handlers for dynamic message action bars
    setupActionBarDelegation();
}

function initializeSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth <= 768) {
        sidebar.classList.remove('show');
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');

    if (sidebar) {
        sidebar.classList.toggle('show');
        sidebarExpanded = sidebar.classList.contains('show');

        // Update toggle button state
        if (sidebarToggle) {
            sidebarToggle.classList.toggle('active', sidebarExpanded);
        }
    }
}

function toggleHistoryPanel() {
    const historyPanel = document.getElementById('chatHistoryPanel');
    const historyBtn = document.getElementById('historyBtn');
    const settingsPanel = document.getElementById('settingsPanel');
    const settingsBtn = document.getElementById('settingsBtn');

    if (historyPanel && historyBtn) {
        const isVisible = historyPanel.classList.contains('show');

        // Close settings panel if open
        if (settingsPanel && settingsPanel.classList.contains('show')) {
            hideSettingsPanel();
        }

        if (isVisible) {
            hideHistoryPanel();
        } else {
            showHistoryPanel();
        }
    }
}

function showHistoryPanel() {
    const historyPanel = document.getElementById('chatHistoryPanel');
    const historyBtn = document.getElementById('historyBtn');

    if (historyPanel && historyBtn) {
        historyPanel.classList.add('show');
        historyBtn.classList.add('active');
    }
}

function hideHistoryPanel() {
    const historyPanel = document.getElementById('chatHistoryPanel');
    const historyBtn = document.getElementById('historyBtn');

    if (historyPanel && historyBtn) {
        historyPanel.classList.remove('show');
        historyBtn.classList.remove('active');
    }
}

function hideSettingsPanel() {
    const settingsPanel = document.getElementById('settingsPanel');
    const settingsBtn = document.getElementById('settingsBtn');
    
    if (settingsPanel && settingsBtn) {
        settingsPanel.classList.remove('show');
        settingsBtn.classList.remove('active');
    }
}

function toggleSettingsPanel() {
    const settingsPanel = document.getElementById('settingsPanel');
    const settingsBtn = document.getElementById('settingsBtn');
    const historyPanel = document.getElementById('chatHistoryPanel');
    
    if (settingsPanel && settingsBtn) {
        const isVisible = settingsPanel.classList.contains('show');
        
        // Close history panel if open
        if (historyPanel && historyPanel.classList.contains('show')) {
            hideHistoryPanel();
        }
        
        if (isVisible) {
            hideSettingsPanel();
        } else {
            settingsPanel.classList.add('show');
            settingsBtn.classList.add('active');
        }
    }
}

function closePanels() {
    hideHistoryPanel();
    hideSettingsPanel();
    hideProfileDropdown();
}

async function sendMessage(message) {
    if (!message || isLoading) return;

    isLoading = true;

    // Clear inputs
    const mainInput = document.getElementById('messageInput');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const sendChatBtn = document.getElementById('sendChatBtn');

    if (mainInput) {
        mainInput.value = '';
        if (sendBtn) sendBtn.disabled = true;
    }
    if (chatInput) {
        chatInput.value = '';
        if (sendChatBtn) sendChatBtn.disabled = true;
    }

    // Switch to chat view if in welcome state
    switchToChatView();

    // Add user message to UI
    addMessageToUI(message, true);

    // Create placeholder for streaming AI response
    const messagesList = document.getElementById('messagesList');
    const aiMessageDiv = document.createElement('div');
    aiMessageDiv.className = 'message ai-message streaming';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    const messageText = document.createElement('div');
    messageText.className = 'message-text';
    messageText.textContent = '';
    
    messageContent.appendChild(messageText);
    aiMessageDiv.appendChild(messageContent);
    messagesList.appendChild(aiMessageDiv);
    scrollToBottomForce();

    try {
        // Use EventSource for Server-Sent Events
        const response = await fetch('/api/send_message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                chat_id: currentChatId
            })
        });

        if (!response.ok) {
            throw new Error('Failed to send message');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n\n');
            buffer = lines.pop();
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = JSON.parse(line.slice(6));
                    
                    if (data.type === 'start') {
                        if (!currentChatId) {
                            currentChatId = data.chat_id;
                            setLastChatId(currentChatId);
                            await ensureChatInHistory(currentChatId);
                            
                            // Request better title
                            fetch('/api/retitle_chat', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ chat_id: currentChatId, first_message: message })
                            }).then(r => r.json()).then(res => {
                                if (res && res.title) {
                                    const item = document.querySelector(`.chat-history-item[data-chat-id="${currentChatId}"] .chat-title`);
                                    if (item) item.textContent = res.title;
                                }
                            }).catch(() => {});
                        }
                    } else if (data.type === 'chunk') {
                        messageText.textContent += data.content;
                        scrollToBottom();
                    } else if (data.type === 'end') {
                        aiMessageDiv.classList.remove('streaming');
                        
                        // Add action bar
                        const actionBar = document.createElement('div');
                        actionBar.className = 'message-action-bar';
                        actionBar.innerHTML = `
                            <button class="action-btn copy-btn" title="Copy"><i class="fas fa-copy"></i></button>
                            <button class="action-btn thumbs-up-btn" title="Thumbs Up"><i class="fas fa-thumbs-up"></i></button>
                            <button class="action-btn thumbs-down-btn" title="Thumbs Down"><i class="fas fa-thumbs-down"></i></button>
                            <button class="action-btn retry-btn" title="Retry"><i class="fas fa-redo"></i></button>
                        `;
                        messageContent.appendChild(actionBar);
                        
                        const feedback = document.createElement('div');
                        feedback.className = 'message-feedback';
                        messageContent.appendChild(feedback);
                    }
                }
            }
        }

    } catch (error) {
        console.error('Error sending message:', error);
        messageText.textContent = 'Sorry, I encountered an error. Please try again.';
        aiMessageDiv.classList.remove('streaming');
        aiMessageDiv.classList.add('error-message');
    }

    isLoading = false;

    // Focus the chat input
    if (chatInput) {
        chatInput.focus();
    }
}

// Ensure a chat exists in the sidebar history; if not, fetch and prepend
async function ensureChatInHistory(chatId) {
    if (!chatId) return;
    const existing = document.querySelector(`.chat-history-item[data-chat-id="${chatId}"]`);
    if (existing) return;
    try {
        const response = await fetch(`/api/get_chat/${chatId}`);
        const data = await response.json();
        if (!response.ok || !data || !data.chat) return;
        const chatsList = document.getElementById('chatsList');
        if (!chatsList) return;

        const item = document.createElement('div');
        item.className = 'chat-history-item active';
        item.dataset.chatId = String(data.chat.id);
        const titleDiv = document.createElement('div');
        titleDiv.className = 'chat-title';
        titleDiv.textContent = data.chat.title || 'New Chat';
        const previewDiv = document.createElement('div');
        previewDiv.className = 'chat-preview';
        const firstMessage = (data.chat.messages && data.chat.messages[0] && data.chat.messages[0].content) || '';
        previewDiv.textContent = firstMessage.length > 50 ? firstMessage.slice(0, 50) + '...' : firstMessage;
        const delBtn = document.createElement('button');
        delBtn.className = 'delete-chat-btn';
        delBtn.dataset.chatId = String(data.chat.id);
        delBtn.title = 'Delete';
        delBtn.innerHTML = '<i class="fas fa-trash"></i>';

        item.appendChild(titleDiv);
        item.appendChild(previewDiv);
        item.appendChild(delBtn);

        // Remove any existing active marking
        document.querySelectorAll('.chat-history-item').forEach(el => el.classList.remove('active'));
        chatsList.prepend(item);
    } catch (e) {
        // Silent fail - sidebar will update next navigation
    }
}

function addMessageToUI(content, isUser, isError = false) {
    const messagesList = document.getElementById('messagesList');
    if (!messagesList) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}${isError ? ' error-message' : ''}`;

    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';

    const messageText = document.createElement('div');
    messageText.className = 'message-text';

    // Always render as plain text (no HTML parsing/formatting)
    messageText.textContent = content;

    // No avatar beside AI messages

    messageContent.appendChild(messageText);
    messageDiv.appendChild(messageContent);

    // Add message action bar for AI messages (design preserved)
    if (!isUser) {
        const actionBar = document.createElement('div');
        actionBar.className = 'message-action-bar';
        actionBar.innerHTML = `
            <button class="action-btn copy-btn" title="Copy"><i class="fas fa-copy"></i></button>
            <button class="action-btn thumbs-up-btn" title="Thumbs Up"><i class="fas fa-thumbs-up"></i></button>
            <button class="action-btn thumbs-down-btn" title="Thumbs Down"><i class="fas fa-thumbs-down"></i></button>
            <button class="action-btn retry-btn" title="Retry"><i class="fas fa-redo"></i></button>
        `;
        // Place the action bar inside the message-content so it appears below the text
        messageContent.appendChild(actionBar);

        // Tiny feedback line just under the buttons
        const feedback = document.createElement('div');
        feedback.className = 'message-feedback';
        messageContent.appendChild(feedback);

        // Add event listeners
        const copyBtn = actionBar.querySelector('.copy-btn');
        const thumbsUpBtn = actionBar.querySelector('.thumbs-up-btn');
        const thumbsDownBtn = actionBar.querySelector('.thumbs-down-btn');
        const retryBtn = actionBar.querySelector('.retry-btn');
        if (copyBtn) copyBtn.onclick = () => handleCopyMessage(messageText.innerText, copyBtn);
        if (thumbsUpBtn) thumbsUpBtn.onclick = () => handleThumbsUp(messageDiv, thumbsUpBtn);
        if (thumbsDownBtn) thumbsDownBtn.onclick = () => handleThumbsDown(messageDiv, thumbsDownBtn);
        if (retryBtn) retryBtn.onclick = () => handleRetryMessage(messageText.innerText, messageDiv);
    }

    messagesList.appendChild(messageDiv);
    scrollToBottom();
}

// Removed typing indicator and HTML replacement to ensure immediate rendering without delays

// Removed streaming logic; AI responses are appended immediately as plain text

// Removed HTML enhancement and parsing utilities

// Removed HTML runner since HTML parsing/preview is disabled

// Delete options modal
function showDeleteOptionsModal() {
    const m = document.getElementById('deleteOptionsModal');
    const overlay = document.getElementById('deleteOptionsOverlay');
    const closeBtn = document.getElementById('closeDeleteOptions');
    const delCurrent = document.getElementById('deleteCurrentBtn');
    const delAll = document.getElementById('deleteAllBtn');
    if (!m) return;
    m.classList.add('show');
    const hide = () => m.classList.remove('show');
    if (overlay) overlay.onclick = hide;
    if (closeBtn) closeBtn.onclick = hide;
    if (delCurrent) delCurrent.onclick = async () => { hide(); if (currentChatId) { await deleteChat(currentChatId); } else { showError('No current chat to delete'); } };
    if (delAll) delAll.onclick = async () => { hide(); const confirmed = await confirmDeleteAllCentered(); if (confirmed) { await deleteAllChats(); } };
}

async function loadChat(chatId) {
    if (chatId === currentChatId) return;

    try {
        showLoading();
        const response = await fetch(`/api/get_chat/${chatId}`);
        const data = await response.json();

        if (response.ok) {
            currentChatId = chatId;
            setLastChatId(chatId);

            // Switch to chat view
            switchToChatView();

            // Clear messages and load chat messages
            const messagesList = document.getElementById('messagesList');
            if (messagesList) {
                messagesList.innerHTML = '';

                data.chat.messages.forEach(message => {
                    addMessageToUI(message.content, message.is_user);
                });
            }

            // Update active chat item
            document.querySelectorAll('.chat-history-item').forEach(item => {
                item.classList.remove('active');
            });
            const activeItem = document.querySelector(`[data-chat-id="${chatId}"]`);
            if (activeItem) {
                activeItem.classList.add('active');
            }

            // Restore message scroll position if available
            const mc = document.getElementById('messagesContainer');
            const lastMsgScroll = getLastMsgScroll();
            if (mc && lastMsgScroll !== null) {
                mc.scrollTop = lastMsgScroll;
            }

            // Hide history panel on mobile
            if (window.innerWidth < 768) {
                hideHistoryPanel();
            }
        } else {
            throw new Error(data.error || 'Failed to load chat');
        }
    } catch (error) {
        console.error('Error loading chat:', error);
        showError('Failed to load chat');
    }

    hideLoading();
}

function newChat() {
    currentChatId = null;
    clearLastChatId();

    // Clear active chat
    document.querySelectorAll('.chat-history-item').forEach(item => {
        item.classList.remove('active');
    });

    // Switch to welcome view
    switchToWelcomeView();

    // Hide panels on mobile
    if (window.innerWidth < 768) {
        closePanels();
    }

    // Focus main input
    const mainInput = document.getElementById('messageInput');
    if (mainInput) {
        mainInput.focus();
    }
}

async function deleteChat(chatId) {
    const confirmed = await confirmDeleteCentered();
    if (!confirmed) return;

    try {
        const response = await fetch(`/api/delete_chat/${chatId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            // Remove from UI
            const chatItem = document.querySelector(`[data-chat-id="${chatId}"]`);
            if (chatItem) {
                chatItem.remove();
            }

            // If it was the current chat, start a new one
            if (currentChatId === chatId) {
                newChat();
            }
        } else {
            throw new Error('Failed to delete chat');
        }
    } catch (error) {
        console.error('Error deleting chat:', error);
        showError('Failed to delete chat');
    }
}

function showDeleteConfirmation() {
    if (confirm('Are you sure you want to delete all chats? This action cannot be undone.')) {
        deleteAllChats();
    }
}

async function deleteAllChats() {
    try {
        const response = await fetch('/api/delete_all_chats', {
            method: 'DELETE'
        });

        if (response.ok) {
            // Clear chat list
            const chatsList = document.getElementById('chatsList');
            if (chatsList) {
                chatsList.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 20px;">No chats yet</p>';
            }

            // Start new chat
            newChat();
            showSuccess('All chats deleted successfully');
        } else {
            throw new Error('Failed to delete all chats');
        }
    } catch (error) {
        console.error('Error deleting all chats:', error);
        showError('Failed to delete all chats');
    }
}

// Centered confirmation dialog for deleting a single chat
function confirmDeleteCentered() {
    return new Promise(resolve => {
        const modal = document.getElementById('confirmDeleteModal');
        const overlay = document.getElementById('confirmDeleteOverlay');
        const closeBtn = document.getElementById('closeConfirmDelete');
        const cancelBtn = document.getElementById('cancelConfirmDeleteBtn');
        const confirmBtn = document.getElementById('confirmDeleteBtn');
        if (!modal) { resolve(confirm('Are you sure you want to delete this chat?')); return; }
        const cleanup = () => {
            if (modal) modal.classList.remove('show');
            if (confirmBtn) confirmBtn.onclick = null;
            if (cancelBtn) cancelBtn.onclick = null;
            if (closeBtn) closeBtn.onclick = null;
            if (overlay) overlay.onclick = null;
        };
        const confirmAction = () => { cleanup(); resolve(true); };
        const cancelAction = () => { cleanup(); resolve(false); };
        if (confirmBtn) confirmBtn.onclick = confirmAction;
        if (cancelBtn) cancelBtn.onclick = cancelAction;
        if (closeBtn) closeBtn.onclick = cancelAction;
        if (overlay) overlay.onclick = cancelAction;
        modal.classList.add('show');
    });
}

function confirmDeleteAllCentered() {
    return new Promise(resolve => {
        const modal = document.getElementById('confirmDeleteAllModal');
        const overlay = document.getElementById('confirmDeleteAllOverlay');
        const closeBtn = document.getElementById('closeConfirmDeleteAll');
        const cancelBtn = document.getElementById('cancelConfirmDeleteAllBtn');
        const confirmBtn = document.getElementById('confirmDeleteAllBtn');
        if (!modal) { resolve(confirm('Delete all chats? This cannot be undone.')); return; }
        const cleanup = () => {
            if (modal) modal.classList.remove('show');
            if (confirmBtn) confirmBtn.onclick = null;
            if (cancelBtn) cancelBtn.onclick = null;
            if (closeBtn) closeBtn.onclick = null;
            if (overlay) overlay.onclick = null;
        };
        const confirmAction = () => { cleanup(); resolve(true); };
        const cancelAction = () => { cleanup(); resolve(false); };
        if (confirmBtn) confirmBtn.onclick = confirmAction;
        if (cancelBtn) cancelBtn.onclick = cancelAction;
        if (closeBtn) closeBtn.onclick = cancelAction;
        if (overlay) overlay.onclick = cancelAction;
        modal.classList.add('show');
    });
}

function switchToChatView() {
    const welcomeState = document.getElementById('welcomeState');
    const chatMessages = document.getElementById('chatMessages');

    if (welcomeState && chatMessages) {
        welcomeState.style.display = 'none';
        chatMessages.style.display = 'flex';
    }
    setLastView('chat');
}

function switchToWelcomeView() {
    const welcomeState = document.getElementById('welcomeState');
    const chatMessages = document.getElementById('chatMessages');

    if (welcomeState && chatMessages) {
        welcomeState.style.display = 'flex';
        chatMessages.style.display = 'none';

        // Clear messages
        const messagesList = document.getElementById('messagesList');
        if (messagesList) {
            messagesList.innerHTML = '';
        }
    }
    setLastView('welcome');
}

function toggleProfileDropdown() {
    const profileDropdown = document.getElementById('profileDropdown');
    if (profileDropdown) {
        const isVisible = profileDropdown.classList.contains('show');

        if (isVisible) {
            hideProfileDropdown();
        } else {
            showProfileDropdown();
        }
    }
}

function showProfileDropdown() {
    const profileDropdown = document.getElementById('profileDropdown');
    if (profileDropdown) {
        profileDropdown.classList.add('show');
    }
}

function hideProfileDropdown() {
    const profileDropdown = document.getElementById('profileDropdown');
    if (profileDropdown) {
        profileDropdown.classList.remove('show');
    }
}

function showPasswordModal() {
    const passwordModal = document.getElementById('passwordModal');
    if (passwordModal) {
        passwordModal.classList.add('show');
        // Clear form
        const form = document.getElementById('passwordForm');
        if (form) {
            form.reset();
        }
    }
}

function hidePasswordModal() {
    const passwordModal = document.getElementById('passwordModal');
    if (passwordModal) {
        passwordModal.classList.remove('show');
    }
}

async function saveDisplayName(displayName) {
    if (!displayName.trim()) return;

    try {
        const response = await fetch('/api/update_profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                display_name: displayName.trim()
            })
        });

        const data = await response.json();

        if (response.ok) {
            showSuccess('Display name updated successfully');

            // Update UI elements
            const userAvatars = document.querySelectorAll('.user-avatar');
            userAvatars.forEach(avatar => {
                avatar.textContent = displayName.charAt(0).toUpperCase();
            });

            const profileName = document.querySelector('.profile-name');
            if (profileName) {
                profileName.textContent = displayName;
            }
        } else {
            throw new Error(data.error || 'Failed to update display name');
        }
    } catch (error) {
        console.error('Error updating display name:', error);
        showError(error.message);
    }
}

async function saveTheme(theme) {
    try {
        const response = await fetch('/api/update_profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                theme_preference: theme
            })
        });

        const data = await response.json();

        if (response.ok) {
            showSuccess('Theme updated successfully');
            // You can add theme switching logic here if needed
        } else {
            throw new Error(data.error || 'Failed to update theme');
        }
    } catch (error) {
        console.error('Error updating theme:', error);
        showError(error.message);
    }
}

async function savePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!currentPassword || !newPassword || !confirmPassword) {
        showError('Please fill in all password fields');
        return;
    }

    if (newPassword !== confirmPassword) {
        showError('New passwords do not match');
        return;
    }

    if (newPassword.length < 6) {
        showError('New password must be at least 6 characters long');
        return;
    }

    try {
        const response = await fetch('/api/update_profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword
            })
        });

        const data = await response.json();

        if (response.ok) {
            hidePasswordModal();
            showSuccess('Password updated successfully');
        } else {
            throw new Error(data.error || 'Failed to update password');
        }
    } catch (error) {
        console.error('Error updating password:', error);
        showError(error.message);
    }
}

async function refreshChatsList() {
    // Deprecated: in-place updates are used instead of reloading
    return;
}

function autoResizeTextareas() {
    const textareas = document.querySelectorAll('#messageInput, #chatInput');

    textareas.forEach(textarea => {
        if (textarea) {
            textarea.addEventListener('input', function () {
                this.style.height = 'auto';
                this.style.height = Math.min(this.scrollHeight, 120) + 'px';
            });
        }
    });
}

// Enhanced smooth scrolling with user interaction detection
let isUserScrolling = false;
let autoScrollEnabled = true;
let scrollTimeout = null;

function scrollToBottom() {
    if (!autoScrollEnabled || isUserScrolling) return;

    const messagesContainer = document.getElementById('messagesContainer');
    if (messagesContainer) {
        // Instant scroll for fastest UX
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Also ensure the page itself scrolls to bottom instantly
    window.scrollTo(0, document.body.scrollHeight);
}

// Enhanced scrollToBottom with force option (for when user is not scrolling)
function scrollToBottomForce() {
    const messagesContainer = document.getElementById('messagesContainer');
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    window.scrollTo(0, document.body.scrollHeight);
}

// Detect user scrolling behavior
function setupScrollDetection() {
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer) return;

    let lastScrollTop = messagesContainer.scrollTop;
    let isScrolling = false;

    messagesContainer.addEventListener('scroll', function () {
        const currentScrollTop = messagesContainer.scrollTop;
        const scrollHeight = messagesContainer.scrollHeight;
        const clientHeight = messagesContainer.clientHeight;

        // Check if user is near bottom (within 100px)
        const isNearBottom = (scrollHeight - currentScrollTop - clientHeight) < 100;

        // If user scrolled up significantly, disable auto-scroll
        if (currentScrollTop < lastScrollTop - 50) {
            isUserScrolling = true;
            autoScrollEnabled = false;
        }
        // If user is near bottom, re-enable auto-scroll
        else if (isNearBottom) {
            isUserScrolling = false;
            autoScrollEnabled = true;
        }

        lastScrollTop = currentScrollTop;

        // Clear existing timeout
        if (scrollTimeout) {
            clearTimeout(scrollTimeout);
        }

        // Set timeout to re-enable auto-scroll after user stops scrolling
        scrollTimeout = setTimeout(() => {
            if (isNearBottom) {
                isUserScrolling = false;
                autoScrollEnabled = true;
            }
        }, 1000);
    });

    // Also detect window scroll
    let windowScrollTimeout = null;
    window.addEventListener('scroll', function () {
        if (windowScrollTimeout) {
            clearTimeout(windowScrollTimeout);
        }

        windowScrollTimeout = setTimeout(() => {
            const windowScrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;

            // If user is near bottom of page, re-enable auto-scroll
            if ((documentHeight - windowScrollTop - windowHeight) < 100) {
                isUserScrolling = false;
                autoScrollEnabled = true;
            }
        }, 500);
    });
}

function showLoading() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'flex';
    }
}

function hideLoading() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
}

function showSuccess(message) {
    showAlert(message, 'success');
}

function showError(message) {
    showAlert(message, 'error');
}

function showAlert(message, type) {
    // Create alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        max-width: 400px;
        padding: 16px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        box-shadow: var(--shadow-medium);
        animation: slideInRight 0.3s ease-out;
    `;

    if (type === 'success') {
        alertDiv.style.background = '#22c55e';
    } else {
        alertDiv.style.background = '#ef4444';
    }

    alertDiv.innerHTML = `
        ${message}
        <button onclick="this.parentElement.remove()" style="
            background: none;
            border: none;
            color: white;
            float: right;
            margin-left: 12px;
            cursor: pointer;
            font-size: 18px;
            line-height: 1;
        ">&times;</button>
    `;

    document.body.appendChild(alertDiv);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.remove();
                }
            }, 300);
        }
    }, 5000);
}

// Handle window resize
window.addEventListener('resize', function () {
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth > 768) {
        // Desktop - ensure sidebar is visible
        if (sidebar) {
            sidebar.classList.remove('show');
        }
    } else {
        // Mobile - hide sidebar by default
        if (sidebar && !sidebarExpanded) {
            sidebar.classList.remove('show');
        }
    }
});

// Handle scroll to show/hide header profile icon on mobile
let lastScrollTop = 0;
window.addEventListener('scroll', function () {
    if (window.innerWidth <= 768) {
        const headerProfile = document.getElementById('headerProfileMobile');
        if (headerProfile) {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

            // Show profile icon only when at the very top of the page
            if (scrollTop <= 10) {
                headerProfile.style.display = 'flex';
            } else {
                headerProfile.style.display = 'none';
            }

            lastScrollTop = scrollTop;
        }
    }
});

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Wire profile dropdown Settings to open centered settings modal
(function setupCenteredSettingsModal() {
    const settingsMenuItem = document.getElementById('settingsMenuItem');
    const modal = document.getElementById('settingsCenterModal');
    const overlay = document.getElementById('settingsCenterOverlay');
    const closeBtn = document.getElementById('closeSettingsCenterModal');
    const cancelBtn = document.getElementById('cancelSettingsCenterBtn');
    const saveBtn = document.getElementById('saveSettingsCenterBtn');
    const displayNameInput = document.getElementById('displayNameCenter');

    function openModal() {
        hideProfileDropdown();
        if (modal) modal.classList.add('show');
    }
    function closeModal() {
        if (modal) modal.classList.remove('show');
    }
    function saveChanges() {
        // Reuse existing profile name save endpoint if available
        const value = (displayNameInput && displayNameInput.value || '').trim();
        if (!value) { closeModal(); return; }
        fetch('/api/update_profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ display_name: value })
        }).then(() => { closeModal(); }).catch(() => { closeModal(); });
    }

    if (settingsMenuItem) settingsMenuItem.addEventListener('click', openModal);
    if (overlay) overlay.addEventListener('click', closeModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if (saveBtn) saveBtn.addEventListener('click', saveChanges);
})();

// Change Password flow from centered settings modal
(function setupChangePasswordFlow() {
    const openBtn = document.getElementById('changePasswordFromCenter');
    const settingsModal = document.getElementById('settingsCenterModal');
    const pwdModal = document.getElementById('passwordModal');
    const pwdOverlay = document.getElementById('passwordModalOverlay');
    const pwdClose = document.getElementById('closePasswordModal');
    const pwdCancel = document.getElementById('cancelPasswordBtn');

    function openPwd() {
        if (settingsModal) settingsModal.classList.remove('show');
        if (pwdModal) pwdModal.classList.add('show');
    }
    function closePwd() {
        if (pwdModal) pwdModal.classList.remove('show');
    }

    if (openBtn) openBtn.addEventListener('click', openPwd);
    if (pwdOverlay) pwdOverlay.addEventListener('click', closePwd);
    if (pwdClose) pwdClose.addEventListener('click', closePwd);
    if (pwdCancel) pwdCancel.addEventListener('click', closePwd);
})();

// Action bar handlers (placeholders)
function handleCopyMessage(text, btn) {
    if (window.SARKAR_AI && window.SARKAR_AI.copyToClipboard) {
        window.SARKAR_AI.copyToClipboard(text).then(() => {
            btn.classList.add('copied');
            setTimeout(() => btn.classList.remove('copied'), 1200);
        });
    }
}
function handleThumbsUp(messageDiv, btn) {
    btn.classList.add('active');
    setTimeout(() => btn.classList.remove('active'), 800);
    // TODO: send feedback to backend
}
function handleThumbsDown(messageDiv, btn) {
    btn.classList.add('active');
    setTimeout(() => btn.classList.remove('active'), 800);
    // TODO: send feedback to backend
}
function handleRetryMessage(_messageText, messageDiv) {
    // Start retry from this AI message element without re-sending a new user bubble
    const aiMessage = messageDiv && messageDiv.closest('.message.ai-message');
    if (aiMessage) retryFromAiMessage(aiMessage);
}

// Attach one-time delegated listeners so buttons always work
function setupActionBarDelegation() {
    document.addEventListener('click', async function (e) {
        const copyBtn = e.target.closest('.message-action-bar .copy-btn');
        const upBtn = e.target.closest('.message-action-bar .thumbs-up-btn');
        const downBtn = e.target.closest('.message-action-bar .thumbs-down-btn');
        const retryBtn = e.target.closest('.message-action-bar .retry-btn');

        if (copyBtn) {
            const message = copyBtn.closest('.message.ai-message');
            const textEl = message && message.querySelector('.message-text');
            const text = (textEl && textEl.innerText) || '';
            if (text) await handleCopyMessage(text, copyBtn);
            setActionFeedback(copyBtn, 'Copied');
            return;
        }

        if (upBtn || downBtn) {
            const bar = (upBtn || downBtn).closest('.message-action-bar');
            if (bar) {
                // Toggle mutually exclusive state
                bar.querySelectorAll('.thumbs-up-btn, .thumbs-down-btn').forEach(b => b.classList.remove('active'));
                (upBtn || downBtn).classList.add('active');
            }
            // Optional: attempt to send feedback to backend; ignore errors
            try {
                const message = (upBtn || downBtn).closest('.message.ai-message');
                const textEl = message && message.querySelector('.message-text');
                const payload = {
                    chat_id: currentChatId,
                    feedback: upBtn ? 'up' : 'down',
                    content: (textEl && textEl.innerText) || ''
                };
                fetch('/api/feedback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                }).catch(() => { /* no-op */ });
            } catch (_) { }
            setActionFeedback((upBtn || downBtn), upBtn ? 'Marked helpful' : 'Marked not helpful');
            return;
        }

        if (retryBtn) {
            const aiMessage = retryBtn.closest('.message.ai-message');
            const lastUserText = findPreviousUserMessageText(aiMessage);
            if (lastUserText) {
                setActionFeedback(retryBtn, 'Retrying…');
                retryFromAiMessage(aiMessage);
            } else {
                setActionFeedback(retryBtn, 'Nothing to retry');
            }
            return;
        }
    });
}

function findPreviousUserMessageText(startNode) {
    if (!startNode) return '';
    let node = startNode.previousElementSibling;
    while (node) {
        if (node.classList && node.classList.contains('user-message')) {
            const textEl = node.querySelector('.message-text');
            return (textEl && textEl.innerText) || '';
        }
        node = node.previousElementSibling;
    }
    return '';
}

// Helper: write tiny feedback below the action bar
function setActionFeedback(sourceBtn, text) {
    if (!sourceBtn) return;
    const content = sourceBtn.closest('.message-content');
    const el = content && content.querySelector('.message-feedback');
    if (!el) return;
    el.textContent = text || '';
    el.style.opacity = '1';
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(() => { el.style.opacity = '0.75'; }, 50);
    clearTimeout(el._clearTimer);
    el._clearTimer = setTimeout(() => { el.textContent = ''; el.style.opacity = '1'; }, 2500);
}

// Create a retry typing indicator and fetch fresh AI response without duplicating user message
function retryFromAiMessage(aiMessageEl) {
    if (!aiMessageEl) return;
    const messagesList = document.getElementById('messagesList');
    if (!messagesList) return;

    // Find the previous user message and get its text
    const userText = findPreviousUserMessageText(aiMessageEl);
    if (!userText) return;

    // Remove the AI message clicked and every message after it
    let node = aiMessageEl;
    while (node) {
        const next = node.nextElementSibling;
        node.remove();
        node = next;
    }

    // Request the API for a new response
    (async () => {
        try {
            const response = await fetch('/api/retry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ anchor_user_text: userText, chat_id: currentChatId, truncate: true })
            });
            const data = await response.json();
            if (response.ok) {
                // Append immediate AI response as plain text
                addMessageToUI((data.ai_message && data.ai_message.content) || '', false);
                // Force scroll to bottom for retry response
                scrollToBottomForce();
            } else {
                addMessageToUI('Sorry, retry failed.', false, true);
                scrollToBottomForce();
            }
        } catch (_) {
            addMessageToUI('Sorry, retry failed.', false, true);
            scrollToBottomForce();
        }
    })();
}

// Add a typing bubble that says "Retrying…" (uses .typing so replaceTypingWithResponse will swap it)
// Removed retry typing indicator
