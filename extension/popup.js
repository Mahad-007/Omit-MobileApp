// Popup script for FocusSphere Blocker extension

document.addEventListener('DOMContentLoaded', () => {
  const blockedCountEl = document.getElementById('blockedCount');
  const focusModeEl = document.getElementById('focusMode');
  const syncBtn = document.getElementById('syncBtn');
  const settingsBtn = document.getElementById('settingsBtn');

  // Load current status
  chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
    if (response) {
      blockedCountEl.textContent = response.blockedCount || 0;
      focusModeEl.textContent = response.focusMode ? 'Active' : 'Inactive';
      focusModeEl.style.color = response.focusMode ? '#28a745' : '#dc3545';
    }
  });

  // Sync button
  syncBtn.addEventListener('click', async () => {
    syncBtn.textContent = 'Syncing...';
    syncBtn.disabled = true;

    try {
      // First try to get user data from web app
      chrome.runtime.sendMessage({ action: 'getUserDataFromWebApp' }, async (userDataResponse) => {
        if (userDataResponse && userDataResponse.userData) {
          // Set user ID if we got it
          if (userDataResponse.userData.userId) {
            chrome.runtime.sendMessage({ 
              action: 'setUserId', 
              userId: userDataResponse.userData.userId 
            });
          }
        }
        
        // Now sync
        chrome.runtime.sendMessage({ action: 'sync' }, (response) => {
          if (response && response.success) {
            syncBtn.textContent = 'Synced!';
            setTimeout(() => {
              syncBtn.textContent = 'Sync with App';
              syncBtn.disabled = false;
              // Reload status
              chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
                if (response) {
                  blockedCountEl.textContent = response.blockedCount || 0;
                  focusModeEl.textContent = response.focusMode ? 'Active' : 'Inactive';
                  focusModeEl.style.color = response.focusMode ? '#28a745' : '#dc3545';
                }
              });
            }, 1000);
          } else {
            syncBtn.textContent = response?.error || 'Sync Failed';
            setTimeout(() => {
              syncBtn.textContent = 'Sync with App';
              syncBtn.disabled = false;
            }, 2000);
          }
        });
      });
    } catch (error) {
      syncBtn.textContent = 'Error';
      setTimeout(() => {
        syncBtn.textContent = 'Sync with App';
        syncBtn.disabled = false;
      }, 2000);
    }
  });

  // Settings button
  settingsBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:8080/blocker' });
  });
});

