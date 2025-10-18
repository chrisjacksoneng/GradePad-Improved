// Enhanced Error Handling for GradePad
class ErrorHandler {
  constructor() {
    this.setupGlobalErrorHandling();
    this.setupUnhandledRejections();
  }

  setupGlobalErrorHandling() {
    window.addEventListener('error', (event) => {
      console.error('🚨 Global Error:', event.error);
      this.showUserFriendlyError('Something went wrong. Please try again.');
    });
  }

  setupUnhandledRejections() {
    window.addEventListener('unhandledrejection', (event) => {
      console.error('🚨 Unhandled Promise Rejection:', event.reason);
      this.showUserFriendlyError('A network error occurred. Please check your connection.');
      event.preventDefault(); // Prevent default browser error handling
    });
  }

  showUserFriendlyError(message, type = 'error') {
    // Remove existing notifications
    const existingNotification = document.getElementById('error-notification');
    if (existingNotification) {
      existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.id = 'error-notification';
    notification.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span>${type === 'error' ? '⚠️' : 'ℹ️'} ${message}</span>
        <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: white; font-size: 18px; cursor: pointer;">
          ×
        </button>
      </div>
    `;
    
    const backgroundColor = type === 'error' ? '#f44336' : '#2196F3';
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${backgroundColor};
      color: white;
      padding: 16px 20px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 1002;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      max-width: 400px;
      animation: slideIn 0.3s ease-out;
    `;

    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
  }

  // Database error handling (localStorage-based)
  handleDatabaseError(error, context = '') {
    console.error(`💾 Database Error ${context}:`, error);
    
    let userMessage = 'A database error occurred.';
    
    if (error.name === 'QuotaExceededError') {
      userMessage = 'Storage quota exceeded. Please clear some data.';
    } else if (error.name === 'SecurityError') {
      userMessage = 'Storage access denied. Please check your browser settings.';
    } else {
      userMessage = `Database error: ${error.message}`;
    }
    
    this.showUserFriendlyError(userMessage);
    return userMessage;
  }

  // Form validation error handling
  handleValidationError(field, message) {
    const input = document.querySelector(`[name="${field}"], #${field}`);
    if (input) {
      input.style.borderColor = '#f44336';
      input.focus();
      
      // Remove error styling after user starts typing
      input.addEventListener('input', () => {
        input.style.borderColor = '';
      }, { once: true });
    }
    
    this.showUserFriendlyError(message);
  }

  // Success notification
  showSuccess(message) {
    this.showUserFriendlyError(message, 'success');
  }
}

// Create global error handler instance
window.errorHandler = new ErrorHandler();

// Export for module usage
export default window.errorHandler;
