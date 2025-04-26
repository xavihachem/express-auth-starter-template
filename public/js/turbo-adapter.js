/**
 * Turbo Drive Adapter for Moonify
 * 
 * This script ensures all dynamic components are properly initialized
 * after Turbo Drive page transitions.
 */

document.addEventListener('turbo:load', function() {
  console.log('Turbo page loaded, reinitializing components...');
  
  // Reinitialize all active components
  initializeNotifications();
  initializeSupportPanel();
  initializeUIComponents();
  
  // Run callbacks for specific page elements if they exist
  runPageSpecificCallbacks();
});

/**
 * Initialize notification system after navigation
 */
function initializeNotifications() {
  // Refresh notifications immediately after navigation
  if (typeof checkForNewNotifications === 'function' && 
      document.querySelector('.notification-badge')) {
    checkForNewNotifications();
  }
  
  // Set up periodic refresh of notifications if not already running
  if (typeof notificationInterval === 'undefined' && 
      typeof checkForNewNotifications === 'function' &&
      document.querySelector('.notification-badge')) {
    window.notificationInterval = setInterval(checkForNewNotifications, 30000);
  }
}

/**
 * Initialize UI components after navigation
 */
function initializeUIComponents() {
  // Initialize Bootstrap tooltips
  try {
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach(function(tooltipTriggerEl) {
      new bootstrap.Tooltip(tooltipTriggerEl);
    });
  } catch (e) {
    console.warn('Error initializing tooltips:', e);
  }
  
  // Initialize MDB components
  try {
    if (typeof mdb !== 'undefined' && typeof mdb.Ripple !== 'undefined') {
      document.querySelectorAll('.btn').forEach(function(btn) {
        new mdb.Ripple(btn);
      });
    }
  } catch (e) {
    console.warn('Error initializing MDB components:', e);
  }
}

/**
 * Initialize support panel functionality
 */
function initializeSupportPanel() {
  // Check for panel open request from session storage
  if (window.location.pathname === '/dashboard' && 
      sessionStorage.getItem('openSupportPanel') === 'true') {
    const contactSupportPanel = document.getElementById('contactSupportPanel');
    if (contactSupportPanel) {
      contactSupportPanel.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      sessionStorage.removeItem('openSupportPanel');
    }
  }
  
  // Initialize support ticket links
  const supportTicketLinks = document.querySelectorAll('#supportTicketLink');
  supportTicketLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      
      if (window.location.pathname === '/dashboard') {
        const contactSupportPanel = document.getElementById('contactSupportPanel');
        if (contactSupportPanel) {
          contactSupportPanel.style.display = 'flex';
          document.body.style.overflow = 'hidden';
        }
      } else {
        window.location.href = '/dashboard';
        sessionStorage.setItem('openSupportPanel', 'true');
      }
    });
  });
}

/**
 * Run page-specific callbacks for elements that might exist
 */
function runPageSpecificCallbacks() {
  // Daily rewards initiation
  if (document.getElementById('daily-reward-card')) {
    if (typeof initializeDailyRewards === 'function') {
      initializeDailyRewards();
    }
  }
  
  // Notification panel interaction
  document.querySelectorAll('.js-mark-read').forEach(button => {
    button.addEventListener('click', function() {
      const notificationId = this.getAttribute('data-notification-id');
      if (notificationId && typeof markNotificationRead === 'function') {
        markNotificationRead(notificationId);
      }
    });
  });
}
