// FocusSphere Blocker Extension
// This extension syncs with your FocusSphere app to block distracting websites

// Removed Supabase dependencies as we now sync directly from the web app's local storage
// const SUPABASE_URL = '...'; 
// const SUPABASE_ANON_KEY = '...';

let blockedDomains = new Set();
let focusModeActive = false;
let userId = null;
let accessToken = null;

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('FocusSphere Blocker installed');
  loadBlockedSites();
  
  // Try to get user data from web app on install
  setTimeout(() => {
    getUserDataFromWebApp();
  }, 2000); 
});

// Also try to get user data when extension starts
chrome.runtime.onStartup.addListener(() => {
  setTimeout(() => {
    getUserDataFromWebApp();
  }, 2000);
});

// Load blocked sites and tasks from storage
async function loadBlockedSites() {
  try {
    const result = await chrome.storage.local.get(['userId', 'accessToken', 'blockedSites', 'focusMode', 'tasks']);
    userId = result.userId;
    accessToken = result.accessToken;
    focusModeActive = result.focusMode || false;

    if (result.blockedSites) {
      blockedDomains = new Set(result.blockedSites);
      await updateBlockingRules();
    }
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

// Sync from payload provided by web app
async function syncFromPayload(data) {
    if (!data) return;
    
    console.log('[FocusSphere] Syncing from payload:', data);
    
    if (data.userId) userId = data.userId;
    if (data.accessToken) accessToken = data.accessToken;
    if (typeof data.focusMode === 'boolean') focusModeActive = data.focusMode;
    
    const updates = { 
        userId, 
        accessToken, 
        focusMode: focusModeActive 
    };

    // Save tasks if provided
    if (data.tasks) {
        updates.tasks = data.tasks;
        console.log(`[FocusSphere] Received ${data.tasks.length} tasks from payload.`);
    } else {
        console.log('[FocusSphere] No tasks in payload.');
    }

    // Save state
    await chrome.storage.local.set(updates);
    
    // Process blocked apps if provided
    if (data.blockedApps && Array.isArray(data.blockedApps)) {
        blockedDomains.clear();
        
        data.blockedApps.forEach(app => {
            const domain = extractDomain(app.url);
            if (domain) {
                // Check blocking rules
                if (app.blocked && (app.blockMode === 'always' || focusModeActive)) {
                    blockedDomains.add(domain);
                }
            }
        });
        
        // Cache domains
        await chrome.storage.local.set({ blockedSites: Array.from(blockedDomains) });
        console.log(`[FocusSphere] Updated ${blockedDomains.size} blocked domains from payload.`);
        
        // Update rules
        await updateBlockingRules();
    }
}

// Extract domain from URL
function extractDomain(url) {
  try {
    // Remove protocol if present
    let domain = url.replace(/^https?:\/\//, '');
    // Remove www. if present
    domain = domain.replace(/^www\./, '');
    // Remove path and query parameters
    domain = domain.split('/')[0];
    domain = domain.split('?')[0];
    // Remove port if present
    domain = domain.split(':')[0];
    return domain.toLowerCase();
  } catch (error) {
    return null;
  }
}

// Update blocking rules using declarativeNetRequest API (Manifest V3)
// Update blocking rules using declarativeNetRequest API (Manifest V3)
async function updateBlockingRules() {
  try {
    // Fetch currently active dynamic rules to identify what needs to be removed
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existingRules.map(rule => rule.id);

    // Create new rules for currently blocked domains
    const addRules = [];
    let ruleId = 1;

    for (const domain of blockedDomains) {
      addRules.push({
        id: ruleId++,
        priority: 1,
        action: {
          type: 'redirect',
          redirect: {
            url: chrome.runtime.getURL(`blocked.html?site=${encodeURIComponent(domain)}`)
          }
        },
        condition: {
          urlFilter: `||${domain}`,
          resourceTypes: ['main_frame']
        }
      });
    }

    // Perform atomic update: remove old rules AND add new rules in one call
    // This prevents race conditions where an ID is added before it successfully removed in a separate call
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: removeRuleIds,
      addRules: addRules
    });
    
    console.log(`[FocusSphere] rules updated. Removed ${removeRuleIds.length}, Added ${addRules.length}`);

  } catch (error) {
    console.error('[FocusSphere] Error updating blocking rules:', error);
  }
}

// Listen for messages from popup, content scripts, or external sources
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
     // User asking to check local storage of the web page
     if (request.action === 'sync') {
        getUserDataFromWebApp().then(data => {
            if (data) {
                syncFromPayload(data);
                sendResponse({ success: true });
            } else {
                sendResponse({ success: false, error: 'No data found in web app' });
            }
        });
        return true;
     }
     
     if (request.action === 'setUserId' || request.action === 'setFocusMode') {
         // Just force a full sync check
         getUserDataFromWebApp().then(data => {
            if (data) {
                syncFromPayload(data);
                sendResponse({ success: true });
            }
         });
         return true;
     }

    if (request.action === 'getStatus') {
      sendResponse({
        blockedCount: blockedDomains.size,
        focusMode: focusModeActive,
        userId: userId
      });
      return false;
    }

    // Handle new closeTab action
    if (request.action === 'closeTab') {
      if (sender.tab && sender.tab.id) {
        chrome.tabs.remove(sender.tab.id);
      }
      return true;
    }

    // Handle direct sync data update
    if (request.action === 'updateSyncData' && request.syncData) {
        syncFromPayload(request.syncData);
        return true;
    }

    return false;
  } catch (error) {
    console.error('Error handling message:', error);
    sendResponse({ success: false, error: error.message });
    return false;
  }
});

// Allow external messaging from the web app
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  const allowedOrigins = [
    'http://localhost:8080', 
    'http://127.0.0.1:8080',
    'http://localhost:5173',
    'http://127.0.0.1:5173'
  ];
  if (!allowedOrigins.some(origin => sender.origin.startsWith(origin))) {
    sendResponse({ success: false, error: 'Unauthorized origin' });
    return false;
  }

  // If the web app sends the data directly, use it
  // We can modify the extension-sync.ts to send 'updateBlockedSites' with payload
  // Or just rely on the existing 'sync' action triggering a read from storage.
  
  if (request.action === 'sync' || request.action === 'setUserId' || request.action === 'setFocusMode') {
      // Fetch latest from page
       getUserDataFromWebApp().then(data => {
            if (data) {
                syncFromPayload(data);
                sendResponse({ success: true });
            } else {
                sendResponse({ success: false, error: 'No data found' });
            }
       });
       return true;
  }
  
  sendResponse({ success: false, error: 'Unknown action' });
  return false;
});

// Get user data from web app via content script
async function getUserDataFromWebApp() {
  try {
    const tabs = await chrome.tabs.query({});
    
    // Check localStorage sync data
    for (const tab of tabs) {
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'checkLocalStorage' });
        if (response && response.syncData) {
          const data = JSON.parse(response.syncData);
          if (data) {
              await syncFromPayload(data);
              return data;
          }
        }
      } catch (error) {
        continue;
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting user data from web app:', error);
    return null;
  }
}

// Periodic check
chrome.alarms.create('syncBlockedSites', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'syncBlockedSites') {
      getUserDataFromWebApp();
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && (changes.userId || changes.focusMode)) {
    loadBlockedSites();
  }
});

