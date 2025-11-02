// Claude.ai Interface JavaScript
document.addEventListener('DOMContentLoaded', function() {
    initializeClaudeInterface();
});

let currentChatId = null;
let isLoading = false;

function initializeClaudeInterface() {
    // Initialize event listeners
    initializeEventListeners();
    
    // Auto-resize textareas
    autoResizeTextareas();
    
    // Load first chat if available
    const firstChat = document.querySelector('.chat-history-item');
    if (firstChat && !currentChatId) {
        loadChat(parseInt(firstChat.dataset.chatId));
    }
}

function initializeEventListeners() {
    // Main input handling
    const mainInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    
    if (mainInput && sendBtn) {
        mainInput.addEventListener('input', function() {
            const hasText = this.value.trim().length > 0;
            sendBtn.disabled = !hasText;
        });
        
        mainInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!sendBtn.disabled && !isLoading) {
                    sendMessage(this.value.trim());
                }
            }
        });
        
        sendBtn.addEventListener('click', function() {
            if (!this.disabled && !isLoading) {
                sendMessage(mainInput.value.trim());
            }
        });
    }
    
    // Chat input handling
    const chatInput = document.getElementById('chatInput');
    const sendChatBtn = document.getElementById('sendChatBtn');
    
    if (chatInput && sendChatBtn) {
        chatInput.addEventListener('input', function() {
            const hasText = this.value.trim().length > 0;
            sendChatBtn.disabled = !hasText;
        });
        
        chatInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!sendChatBtn.disabled && !isLoading) {
                    sendMessage(this.value.trim());
                }
            }
        });
        
        sendChatBtn.addEventListener('click', function() {
            if (!this.disabled && !isLoading) {
                sendMessage(chatInput.value.trim());
            }
        });
    }
    
    // New chat button
    const newChatBtn = document.getElementById('newChatBtn');
    if (newChatBtn) {
        newChatBtn.addEventListener('click', newChat);
    }
    
    // Sidebar buttons
    const historyBtn = document.getElementById('historyBtn');
    const historyPanel = document.getElementById('chatHistoryPanel');
    const closePanelBtn = document.getElementById('closePanelBtn');
    
    if (historyBtn && historyPanel) {
        historyBtn.addEventListener('click', function() {
            toggleHistoryPanel();
        });
    }
    
    if (closePanelBtn) {
        closePanelBtn.addEventListener('click', function() {
            hideHistoryPanel();
        });
    }
    
    // Settings button
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', function() {
            showSettingsModal();
        });
    }
    
    // User profile button
    const userProfileBtn = document.getElementById('userProfileBtn');
    const profileDropdown = document.getElementById('profileDropdown');
    
    if (userProfileBtn && profileDropdown) {
        userProfileBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleProfileDropdown();
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function() {
            hideProfileDropdown();
        });
        
        profileDropdown.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }
    
    // Settings menu item
    const settingsMenuItem = document.getElementById('settingsMenuItem');
    if (settingsMenuItem) {
        settingsMenuItem.addEventListener('click', function() {
            hideProfileDropdown();
            showSettingsModal();
        });
    }
    
    // Chat history items
    document.addEventListener('click', function(e) {
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
    document.addEventListener('click', function(e) {
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
    
    // Settings form
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', saveSettings);
    }
    
    // Mobile sidebar toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('show');
        });
    }
}

async function sendMessage(message) {
    if (!message || isLoading) return;
    
    isLoading = true;
    // No loading overlay or typing indicators
    
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
    
    try {
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
        
        const data = await response.json();
        
        if (response.ok) {
            // Update current chat ID if it's a new chat
            if (!currentChatId) {
                const newId = data.chat_id;
                currentChatId = newId;
                // Fire-and-forget: request a better title without delaying UI
                try {
                    fetch('/api/retitle_chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ chat_id: newId, first_message: message })
                    }).then(r => r.json()).then(res => {
                        if (res && res.title) {
                            const item = document.querySelector(`.chat-history-item[data-chat-id="${newId}"] .chat-title`);
                            if (item) item.textContent = res.title;
                        }
                    }).catch(() => {});
                } catch (_) { }
            }
            
            // Add AI response to UI immediately as plain text
            addMessageToUI((data.ai_message && data.ai_message.content) || '', false);
        } else {
            throw new Error(data.error || 'Failed to send message');
        }
    } catch (error) {
        console.error('Error sending message:', error);
        addMessageToUI('Sorry, I encountered an error. Please try again.', false, true);
    }
    
    isLoading = false;
    // No loading overlay to hide
    
    // Focus the chat input
    if (chatInput) {
        chatInput.focus();
    }
}

function addMessageToUI(content, isUser, isError = false) {
    const messagesList = document.getElementById('messagesList');
    if (!messagesList) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}${isError ? ' error-message' : ''}`;

    // Avatar
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = isUser ? 'U' : 'S';

    // Content wrapper
    const contentWrap = document.createElement('div');
    contentWrap.className = 'message-content';

    // Text node (always plain text; no HTML parsing)
    const textEl = document.createElement('div');
    textEl.className = 'message-text';
    textEl.textContent = content;

    contentWrap.appendChild(textEl);
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentWrap);

    messagesList.appendChild(messageDiv);
    scrollToBottom();
}

async function loadChat(chatId) {
    if (chatId === currentChatId) return;
    
    try {
        // No loading overlay
        const response = await fetch(`/api/get_chat/${chatId}`);
        const data = await response.json();
        
        if (response.ok) {
            currentChatId = chatId;
            
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
    
    // No loading overlay
}

function newChat() {
    currentChatId = null;
    
    // Clear active chat
    document.querySelectorAll('.chat-history-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Switch to welcome view
    switchToWelcomeView();
    
    // Hide history panel on mobile
    if (window.innerWidth < 768) {
        hideHistoryPanel();
    }
    
    // Focus main input
    const mainInput = document.getElementById('messageInput');
    if (mainInput) {
        mainInput.focus();
    }
}

async function deleteChat(chatId) {
    if (!confirm('Are you sure you want to delete this chat?')) return;
    
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

function switchToChatView() {
    const welcomeState = document.getElementById('welcomeState');
    const chatMessages = document.getElementById('chatMessages');
    
    if (welcomeState && chatMessages) {
        welcomeState.style.display = 'none';
        chatMessages.style.display = 'flex';
    }
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
}

function toggleHistoryPanel() {
    const historyPanel = document.getElementById('chatHistoryPanel');
    const historyBtn = document.getElementById('historyBtn');
    
    if (historyPanel && historyBtn) {
        const isVisible = historyPanel.classList.contains('show');
        
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

function showSettingsModal() {
    const settingsModal = document.getElementById('settingsModal');
    if (settingsModal) {
        new bootstrap.Modal(settingsModal).show();
    }
}

async function saveSettings() {
    const displayName = document.getElementById('displayName').value.trim();
    const themePreference = document.getElementById('themePreference').value;
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    
    try {
        const response = await fetch('/api/update_profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                display_name: displayName,
                theme_preference: themePreference,
                current_password: currentPassword,
                new_password: newPassword
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            const settingsModal = document.getElementById('settingsModal');
            if (settingsModal) {
                bootstrap.Modal.getInstance(settingsModal).hide();
            }
            showSuccess('Settings updated successfully');
            
            // Update display name in header if changed
            if (displayName) {
                const greetingText = document.querySelector('.greeting-text');
                if (greetingText) {
                    greetingText.textContent = `Welcome, ${displayName}`;
                }
            }
        } else {
            throw new Error(data.error || 'Failed to update settings');
        }
    } catch (error) {
        console.error('Error updating settings:', error);
        showError(error.message);
    }
}

async function refreshChatsList() {
    // Simple refresh - reload the page for now
    // In a more sophisticated app, you'd fetch the updated list via API
    location.reload();
}

function autoResizeTextareas() {
    const textareas = document.querySelectorAll('#messageInput, #chatInput');
    
    textareas.forEach(textarea => {
        if (textarea) {
            textarea.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = Math.min(this.scrollHeight, 200) + 'px';
            });
        }
    });
}

function scrollToBottom() {
    const messagesContainer = document.getElementById('messagesContainer');
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
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

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showSuccess(message) {
    showAlert(message, 'success');
}

function showError(message) {
    showAlert(message, 'danger');
}

function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; max-width: 400px;';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}