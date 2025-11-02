/**
 * SARKAR AI - Main JavaScript Application
 * Handles all client-side functionality for the chat application
 */

// Global variables
let isInitialized = false;

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (!isInitialized) {
        initializeApp();
        isInitialized = true;
    }
});

/**
 * Initialize the entire application
 */
function initializeApp() {
    console.log('Initializing SARKAR AI application...');
    
    // Initialize different modules based on current page
    const currentPath = window.location.pathname;
    
    if (currentPath === '/chat') {
        initializeChatPage();
    } else if (currentPath === '/auth' || currentPath === '/') {
        initializeAuthPage();
    } else if (currentPath === '/register') {
        initializeRegisterPage();
    } else if (currentPath.includes('reset_password')) {
        initializeResetPasswordPage();
    }
    
    // Initialize common features
    initializeCommonFeatures();
}

/**
 * Initialize common features across all pages
 */
function initializeCommonFeatures() {
    // Flash message auto-dismiss
    initializeFlashMessages();
    
    // Global error handling
    window.addEventListener('error', function(e) {
        console.error('Global error:', e.error);
    });
    
    // Global unhandled promise rejection handling
    window.addEventListener('unhandledrejection', function(e) {
        console.error('Unhandled promise rejection:', e.reason);
    });
}

/**
 * Initialize flash messages functionality
 */
function initializeFlashMessages() {
    const alerts = document.querySelectorAll('.alert');
    
    alerts.forEach(alert => {
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            if (alert && alert.parentNode) {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }
        }, 5000);
        
        // Add click-to-dismiss functionality
        alert.addEventListener('click', function() {
            const bsAlert = new bootstrap.Alert(this);
            bsAlert.close();
        });
    });
}

/**
 * Initialize authentication page functionality
 */
function initializeAuthPage() {
    console.log('Initializing auth page...');
    
    // Password toggle functionality
    initializePasswordToggles();
    
    // Form validation
    const loginForm = document.querySelector('form[action*="login"]');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            if (!validateLoginForm()) {
                e.preventDefault();
            }
        });
    }
}

/**
 * Initialize register page functionality
 */
function initializeRegisterPage() {
    console.log('Initializing register page...');
    
    // Password toggle functionality
    initializePasswordToggles();
    
    // Real-time form validation
    initializeRegisterValidation();
}

/**
 * Initialize reset password page functionality
 */
function initializeResetPasswordPage() {
    console.log('Initializing reset password page...');
    
    // Password toggle functionality
    initializePasswordToggles();
    
    // Form validation for password reset
    const resetForm = document.getElementById('resetForm');
    if (resetForm) {
        initializePasswordResetValidation();
    }
}

/**
 * Initialize chat page functionality
 */
function initializeChatPage() {
    console.log('Initializing chat page...');
    
    // This function is primarily handled in chat.html template
    // Additional chat-specific JS can be added here if needed
}

/**
 * Initialize password toggle functionality
 */
function initializePasswordToggles() {
    // Password toggle function is defined in templates
    // This ensures it's available globally
    window.togglePassword = function(inputId) {
        const input = document.getElementById(inputId);
        const eye = document.getElementById(inputId + '-eye');
        
        if (!input || !eye) return;
        
        if (input.type === 'password') {
            input.type = 'text';
            eye.className = 'fas fa-eye-slash';
        } else {
            input.type = 'password';
            eye.className = 'fas fa-eye';
        }
    };
}

/**
 * Validate login form
 */
function validateLoginForm() {
    const username = document.getElementById('username');
    const password = document.getElementById('password');
    
    let isValid = true;
    
    // Clear previous errors
    clearFieldError(username);
    clearFieldError(password);
    
    // Username/email validation
    if (!username.value.trim()) {
        showFieldError(username, 'Username or email is required');
        isValid = false;
    }
    
    // Password validation
    if (!password.value.trim()) {
        showFieldError(password, 'Password is required');
        isValid = false;
    }
    
    return isValid;
}

/**
 * Initialize register form validation
 */
function initializeRegisterValidation() {
    const form = document.getElementById('registerForm');
    if (!form) return;
    
    const username = document.getElementById('username');
    const email = document.getElementById('email');
    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirm_password');
    
    // Real-time validation
    if (username) {
        username.addEventListener('blur', () => validateUsername(username));
        username.addEventListener('input', () => clearFieldError(username));
    }
    
    if (email) {
        email.addEventListener('blur', () => validateEmail(email));
        email.addEventListener('input', () => clearFieldError(email));
    }
    
    if (password) {
        password.addEventListener('blur', () => validatePassword(password));
        password.addEventListener('input', () => {
            clearFieldError(password);
            if (confirmPassword.value) {
                validatePasswordMatch(password, confirmPassword);
            }
        });
    }
    
    if (confirmPassword) {
        confirmPassword.addEventListener('blur', () => validatePasswordMatch(password, confirmPassword));
        confirmPassword.addEventListener('input', () => {
            clearFieldError(confirmPassword);
            validatePasswordMatch(password, confirmPassword);
        });
    }
    
    // Form submission validation
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (validateRegisterForm()) {
            this.submit();
        }
    });
}

/**
 * Initialize password reset validation
 */
function initializePasswordResetValidation() {
    const form = document.getElementById('resetForm');
    if (!form) return;
    
    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirm_password');
    
    // Real-time validation
    if (password) {
        password.addEventListener('input', () => {
            clearFieldError(password);
            if (confirmPassword.value) {
                validatePasswordMatch(password, confirmPassword);
            }
        });
    }
    
    if (confirmPassword) {
        confirmPassword.addEventListener('input', () => {
            clearFieldError(confirmPassword);
            validatePasswordMatch(password, confirmPassword);
        });
    }
    
    // Form submission
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (validatePasswordResetForm()) {
            this.submit();
        }
    });
}

/**
 * Validate complete register form
 */
function validateRegisterForm() {
    const username = document.getElementById('username');
    const email = document.getElementById('email');
    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirm_password');
    
    let isValid = true;
    
    // Clear all previous errors
    [username, email, password, confirmPassword].forEach(field => {
        if (field) clearFieldError(field);
    });
    
    // Validate each field
    if (!validateUsername(username)) isValid = false;
    if (!validateEmail(email)) isValid = false;
    if (!validatePassword(password)) isValid = false;
    if (!validatePasswordMatch(password, confirmPassword)) isValid = false;
    
    return isValid;
}

/**
 * Validate password reset form
 */
function validatePasswordResetForm() {
    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirm_password');
    
    let isValid = true;
    
    clearFieldError(password);
    clearFieldError(confirmPassword);
    
    if (!validatePassword(password)) isValid = false;
    if (!validatePasswordMatch(password, confirmPassword)) isValid = false;
    
    return isValid;
}

/**
 * Individual field validation functions
 */
function validateUsername(field) {
    if (!field) return true;
    
    const value = field.value.trim();
    
    if (!value) {
        showFieldError(field, 'Username is required');
        return false;
    }
    
    if (value.length < 3) {
        showFieldError(field, 'Username must be at least 3 characters long');
        return false;
    }
    
    return true;
}

function validateEmail(field) {
    if (!field) return true;
    
    const value = field.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!value) {
        showFieldError(field, 'Email is required');
        return false;
    }
    
    if (!emailRegex.test(value)) {
        showFieldError(field, 'Please enter a valid email address');
        return false;
    }
    
    return true;
}

function validatePassword(field) {
    if (!field) return true;
    
    const value = field.value;
    
    if (!value) {
        showFieldError(field, 'Password is required');
        return false;
    }
    
    if (value.length < 6) {
        showFieldError(field, 'Password must be at least 6 characters long');
        return false;
    }
    
    return true;
}

function validatePasswordMatch(passwordField, confirmPasswordField) {
    if (!passwordField || !confirmPasswordField) return true;
    
    const password = passwordField.value;
    const confirmPassword = confirmPasswordField.value;
    
    if (confirmPassword && password !== confirmPassword) {
        showFieldError(confirmPasswordField, 'Passwords do not match');
        return false;
    }
    
    return true;
}

/**
 * Show field error
 */
function showFieldError(field, message) {
    if (!field) return;
    
    field.classList.add('is-invalid');
    
    // Find or create error element
    let errorElement = field.parentNode.querySelector('.invalid-feedback');
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.className = 'invalid-feedback';
        field.parentNode.appendChild(errorElement);
    }
    
    errorElement.textContent = message;
}

/**
 * Clear field error
 */
function clearFieldError(field) {
    if (!field) return;
    
    field.classList.remove('is-invalid');
    
    const errorElement = field.parentNode.querySelector('.invalid-feedback');
    if (errorElement) {
        errorElement.textContent = '';
    }
}

/**
 * Utility function to show alerts
 */
function showAlert(message, type = 'info', duration = 5000) {
    const alertContainer = document.getElementById('flash-container') || document.body;
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    
    const iconClass = type === 'success' ? 'check-circle' : 
                     type === 'danger' ? 'exclamation-circle' : 'info-circle';
    
    alertDiv.innerHTML = `
        <i class="fas fa-${iconClass} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    alertContainer.appendChild(alertDiv);
    
    // Auto-dismiss
    setTimeout(() => {
        if (alertDiv.parentNode) {
            const bsAlert = new bootstrap.Alert(alertDiv);
            bsAlert.close();
        }
    }, duration);
    
    return alertDiv;
}

/**
 * Utility functions for different alert types
 */
function showSuccess(message, duration = 5000) {
    return showAlert(message, 'success', duration);
}

function showError(message, duration = 7000) {
    return showAlert(message, 'danger', duration);
}

function showInfo(message, duration = 5000) {
    return showAlert(message, 'info', duration);
}

/**
 * Utility function to make API requests
 */
async function apiRequest(url, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
    };
    
    const mergedOptions = { ...defaultOptions, ...options };
    
    try {
        const response = await fetch(url, mergedOptions);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        } else {
            return await response.text();
        }
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

/**
 * Debounce function for input validation
 */
function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * Throttle function for performance optimization
 */
function throttle(func, delay) {
    let inThrottle;
    return function (...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, delay);
        }
    };
}

/**
 * Utility function to escape HTML to prevent XSS
 */
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            document.body.removeChild(textArea);
            return true;
        } catch (err) {
            document.body.removeChild(textArea);
            return false;
        }
    }
}

// Export functions for global access
window.SARKAR_AI = {
    showAlert,
    showSuccess,
    showError,
    showInfo,
    apiRequest,
    copyToClipboard,
    escapeHtml,
    debounce,
    throttle
};

console.log('SARKAR AI application initialized successfully');
