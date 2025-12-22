// Content script to read data from FocusSphere web app
// This runs on the FocusSphere pages and can access localStorage

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getUserData') {
    try {
      // Try to get user data from localStorage
      const syncData = localStorage.getItem('focussphere_sync');
      
      // Try to get from Supabase auth storage (multiple possible keys)
      const supabaseKeys = [
        'sb-wrktigeorjtsxqhxgfgq-auth-token',
        'supabase.auth.token',
        `sb-${window.location.hostname}-auth-token`
      ];
      
      let userData = null;
      
      // First check sync data
      if (syncData) {
        try {
          userData = JSON.parse(syncData);
        } catch (e) {
          console.error('Error parsing sync data:', e);
        }
      }
      
      // If no user ID yet, try to get from Supabase auth
      if (!userData || !userData.userId) {
        // First check our own storage
        const storedUserId = localStorage.getItem('focussphere_user_id');
        if (storedUserId) {
          userData = userData || {};
          userData.userId = storedUserId;
        } else {
          // Try Supabase keys
          for (const key of supabaseKeys) {
            const authData = localStorage.getItem(key);
            if (authData) {
              try {
                const auth = JSON.parse(authData);
                // Try different possible structures
                const user = auth.currentSession?.user || auth.user || auth.session?.user;
                if (user && user.id) {
                  userData = userData || {};
                  userData.userId = user.id;
                  userData.accessToken = auth.access_token || auth.currentSession?.access_token || auth.session?.access_token;
                  break;
                }
              } catch (e) {
                // Try next key
                continue;
              }
            }
          }
        }
      }
      
      // Also check IndexedDB for Supabase auth (if accessible)
      // For now, we'll rely on localStorage
      
      sendResponse({ userData });
    } catch (error) {
      console.error('Error getting user data:', error);
      sendResponse({ userData: null, error: error.message });
    }
    return true; // Will respond asynchronously
  }
  
  if (request.action === 'checkLocalStorage') {
    try {
      const syncData = localStorage.getItem('focussphere_sync');
      sendResponse({ syncData });
    } catch (error) {
      sendResponse({ syncData: null, error: error.message });
    }
    return true;
  }
  
  // Relay saved time to web app
  if (request.action === 'addSavedTime') {
      window.postMessage({
          type: 'OMIT_ADD_TIME',
          payload: { hours: request.hours }
      }, '*');
      sendResponse({ success: true });
      return true;
  }
});

// Listen for messages from the web app
window.addEventListener('message', (event) => {
  // We only accept messages from ourselves
  if (event.source !== window) return;

  if (event.data.type && (event.data.type === 'OMIT_SYNC')) {
    // Send message to background script
    chrome.runtime.sendMessage(event.data.payload);
  }
});

