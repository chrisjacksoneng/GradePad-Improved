// Progressive Web App functionality
class PWAManager {
  constructor() {
    this.init();
  }

  async init() {
    // Register service worker
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('✅ Service Worker registered:', registration);
        
        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              this.showUpdateNotification();
            }
          });
        });
      } catch (error) {
        console.error('❌ Service Worker registration failed:', error);
      }
    }

    // Handle install prompt
    this.setupInstallPrompt();
    
    // Setup offline detection
    this.setupOfflineDetection();
  }

  setupInstallPrompt() {
    let deferredPrompt;
    
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      
      // Install button disabled
      // this.showInstallButton(deferredPrompt);
    });

    window.addEventListener('appinstalled', () => {
      console.log('✅ GradePad installed successfully!');
      this.hideInstallButton();
    });
  }

  showInstallButton(deferredPrompt) {
    // Create install button
    const installBtn = document.createElement('button');
    installBtn.id = 'install-btn';
    installBtn.innerHTML = '📱 Install GradePad';
    installBtn.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #2196F3;
      color: white;
      border: none;
      padding: 12px 20px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 1000;
    `;

    installBtn.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log('Install prompt result:', outcome);
        this.hideInstallButton();
      }
    });

    document.body.appendChild(installBtn);
  }

  hideInstallButton() {
    const installBtn = document.getElementById('install-btn');
    if (installBtn) {
      installBtn.remove();
    }
  }

  setupOfflineDetection() {
    const updateOnlineStatus = () => {
      const status = navigator.onLine ? 'online' : 'offline';
      console.log(`🌐 Status: ${status}`);
      
      if (!navigator.onLine) {
        this.showOfflineNotification();
      } else {
        this.hideOfflineNotification();
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();
  }

  showOfflineNotification() {
    if (document.getElementById('offline-notification')) return;
    
    const notification = document.createElement('div');
    notification.id = 'offline-notification';
    notification.innerHTML = '📡 You\'re offline - some features may be limited';
    notification.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #ff9800;
      color: white;
      text-align: center;
      padding: 12px;
      font-size: 14px;
      z-index: 1000;
    `;
    
    document.body.appendChild(notification);
  }

  hideOfflineNotification() {
    const notification = document.getElementById('offline-notification');
    if (notification) {
      notification.remove();
    }
  }

  showUpdateNotification() {
    const notification = document.createElement('div');
    notification.id = 'update-notification';
    notification.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; max-width: 600px; margin: 0 auto;">
        <span>🔄 New version available!</span>
        <button onclick="window.location.reload()" style="background: white; color: #2196F3; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
          Update
        </button>
      </div>
    `;
    notification.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #2196F3;
      color: white;
      padding: 12px;
      font-size: 14px;
      z-index: 1001;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;
    
    document.body.appendChild(notification);
  }
}

// Initialize PWA when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PWAManager();
});
