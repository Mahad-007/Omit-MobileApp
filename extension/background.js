// FocusSphere Blocker Extension
// This extension syncs with your FocusSphere app to block distracting websites

const SUPABASE_URL = 'https://wrktigeorjtsxqhxgfgq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indya3RpZ2Vvcmp0c3hxaHhnZmdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3OTA4MjksImV4cCI6MjA3ODM2NjgyOX0.13a_AG-lJwMn3ygytePA2gXf7eOTLVDmrbRNu2xxee4';

let blockedDomains = new Set();
let focusModeActive = false;
let userId = null;

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('FocusSphere Blocker installed');
  loadBlockedSites();
  
  // Try to get user ID from web app on install
  setTimeout(() => {
    getUserDataFromWebApp().then((userData) => {
      if (userData && userData.userId) {
        userId = userData.userId;
        chrome.storage.local.set({ userId });
        syncFromSupabase();
      }
    });
  }, 2000); // Wait 2 seconds for content script to be ready
});

// Also try to get user data when extension starts
chrome.runtime.onStartup.addListener(() => {
  setTimeout(() => {
    getUserDataFromWebApp().then((userData) => {
      if (userData && userData.userId) {
        userId = userData.userId;
        chrome.storage.local.set({ userId });
        syncFromSupabase();
      }
    });
  }, 2000);
});

// Load blocked sites from storage or Supabase
async function loadBlockedSites() {
  try {
    // First, try to get user ID from storage
    const result = await chrome.storage.local.get(['userId', 'blockedSites', 'focusMode']);
    userId = result.userId;
    focusModeActive = result.focusMode || false;

    if (userId) {
      // Fetch from Supabase
      await syncFromSupabase();
    } else if (result.blockedSites) {
      // Use cached data
      blockedDomains = new Set(result.blockedSites);
      await updateBlockingRules();
    }
  } catch (error) {
    console.error('Error loading blocked sites:', error);
  }
}

// Check if focus mode is active from Supabase
async function checkFocusModeStatus() {
  if (!userId) return false;

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/focus_sessions?user_id=eq.${userId}&is_active=eq.true&select=*`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        }
      }
    );

    if (response.ok) {
      const sessions = await response.json();
      if (sessions && sessions.length > 0) {
        const session = sessions[0];
        const startedAt = new Date(session.started_at);
        const now = new Date();
        const elapsedMinutes = Math.floor((now.getTime() - startedAt.getTime()) / 60000);
        const remaining = session.duration_minutes - elapsedMinutes;
        
        // Focus mode is active if session exists and hasn't expired
        return remaining > 0;
      }
    }
  } catch (error) {
    console.error('Error checking focus mode:', error);
  }
  return false;
}

// Sync blocked sites from Supabase
async function syncFromSupabase() {
  if (!userId) {
    console.log('No user ID, cannot sync');
    return;
  }

  try {
    // First check focus mode status
    const isFocusModeActive = await checkFocusModeStatus();
    focusModeActive = isFocusModeActive;
    await chrome.storage.local.set({ focusMode: focusModeActive });

    // Get blocked apps
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/blocked_apps?user_id=eq.${userId}&blocked=eq.true&select=url,block_mode`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        }
      }
    );

    if (response.ok) {
      const apps = await response.json();
      blockedDomains.clear();

      apps.forEach(app => {
        // Extract domain from URL
        const domain = extractDomain(app.url);
        if (domain) {
          // Only block if it's "always" mode or focus mode is active
          if (app.block_mode === 'always' || focusModeActive) {
            blockedDomains.add(domain);
          }
        }
      });

      // Cache the domains
      await chrome.storage.local.set({ blockedSites: Array.from(blockedDomains) });
      
      console.log(`Synced ${blockedDomains.size} blocked domains. Focus mode: ${focusModeActive}`);
      
      // Update blocking rules
      await updateBlockingRules();
    } else {
      console.error('Failed to fetch blocked apps:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('Error syncing from Supabase:', error);
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

// Check if URL should be blocked
function shouldBlock(url) {
  if (!blockedDomains.size) return false;

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase().replace(/^www\./, '');
    
    // Check exact match or subdomain
    for (const domain of blockedDomains) {
      if (hostname === domain || hostname.endsWith('.' + domain)) {
        return true;
      }
    }
    return false;
  } catch (error) {
    return false;
  }
}

// Update blocking rules using declarativeNetRequest API (Manifest V3)
async function updateBlockingRules() {
  try {
    // Remove all existing rules first
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const ruleIds = existingRules.map(rule => rule.id);
    if (ruleIds.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: ruleIds
      });
    }

    // Create new rules for blocked domains
    const rules = [];
    let ruleId = 1;

    for (const domain of blockedDomains) {
      // Block main domain
      rules.push({
        id: ruleId++,
        priority: 1,
        action: {
          type: 'redirect',
          redirect: {
            url: chrome.runtime.getURL(`blocked.html?site=${encodeURIComponent(domain)}`)
          }
        },
        condition: {
          urlFilter: `*://${domain}/*`,
          resourceTypes: ['main_frame']
        }
      });

      // Block www subdomain
      rules.push({
        id: ruleId++,
        priority: 1,
        action: {
          type: 'redirect',
          redirect: {
            url: chrome.runtime.getURL(`blocked.html?site=${encodeURIComponent(domain)}`)
          }
        },
        condition: {
          urlFilter: `*://www.${domain}/*`,
          resourceTypes: ['main_frame']
        }
      });
    }

    // Add the new rules
    if (rules.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        addRules: rules
      });
      console.log(`Updated ${rules.length} blocking rules`);
    }
  } catch (error) {
    console.error('Error updating blocking rules:', error);
  }
}

// Listen for messages from popup, content scripts, or external sources
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle all messages with proper error handling
  try {
  if (request.action === 'sync') {
    // If no userId, try to get it from the web app
    if (!userId) {
      getUserDataFromWebApp().then((userData) => {
        if (userData && userData.userId) {
          userId = userData.userId;
          chrome.storage.local.set({ userId });
          syncFromSupabase().then(() => {
            sendResponse({ success: true });
          }).catch((error) => {
            sendResponse({ success: false, error: error.message });
          });
        } else {
          sendResponse({ success: false, error: 'No user ID found. Please sync from the web app.' });
        }
      });
    } else {
      syncFromSupabase().then(() => {
        sendResponse({ success: true });
      }).catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
    }
    return true; // Will respond asynchronously
  }
    
    if (request.action === 'setUserId') {
      userId = request.userId;
      chrome.storage.local.set({ userId });
      syncFromSupabase().then(() => {
        sendResponse({ success: true });
      }).catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
      return true;
    }

    if (request.action === 'setFocusMode') {
      focusModeActive = request.active;
      chrome.storage.local.set({ focusMode: focusModeActive });
      syncFromSupabase().then(() => {
        sendResponse({ success: true });
      }).catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
      return true;
    }

    if (request.action === 'getStatus') {
      sendResponse({
        blockedCount: blockedDomains.size,
        focusMode: focusModeActive,
        userId: userId
      });
      return false; // Synchronous response
    }

    if (request.action === 'getUserDataFromWebApp') {
      getUserDataFromWebApp().then((userData) => {
        sendResponse({ userData });
      }).catch((error) => {
        sendResponse({ userData: null, error: error.message });
      });
      return true; // Asynchronous
    }

    // Handle external messages from web app
    if (request.action === 'externalSync' || request.action === 'externalSetUserId' || request.action === 'externalSetFocusMode') {
      // These come from the web app
      if (request.action === 'externalSetUserId') {
        userId = request.userId;
        chrome.storage.local.set({ userId });
      } else if (request.action === 'externalSetFocusMode') {
        focusModeActive = request.active;
        chrome.storage.local.set({ focusMode: focusModeActive });
      }
      syncFromSupabase().then(() => {
        sendResponse({ success: true });
      }).catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
      return true;
    }
  } catch (error) {
    console.error('Error handling message:', error);
    sendResponse({ success: false, error: error.message });
    return false;
  }
});

// Allow external messaging from the web app
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  // Allow localhost for development
  const allowedOrigins = ['http://localhost:8080', 'http://127.0.0.1:8080'];
  if (!allowedOrigins.some(origin => sender.origin.startsWith(origin))) {
    sendResponse({ success: false, error: 'Unauthorized origin' });
    return false;
  }

  try {
    if (request.action === 'sync') {
      syncFromSupabase().then(() => {
        sendResponse({ success: true });
      }).catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
      return true;
    }

    if (request.action === 'setUserId') {
      userId = request.userId;
      chrome.storage.local.set({ userId });
      syncFromSupabase().then(() => {
        sendResponse({ success: true });
      }).catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
      return true;
    }

    if (request.action === 'setFocusMode') {
      focusModeActive = request.active;
      chrome.storage.local.set({ focusMode: focusModeActive });
      syncFromSupabase().then(() => {
        sendResponse({ success: true });
      }).catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
      return true;
    }

    sendResponse({ success: false, error: 'Unknown action' });
    return false;
  } catch (error) {
    console.error('Error handling external message:', error);
    sendResponse({ success: false, error: error.message });
    return false;
  }
});

// Get user data from web app via content script
async function getUserDataFromWebApp() {
  try {
    const tabs = await chrome.tabs.query({ url: ['http://localhost:8080/*', 'http://127.0.0.1:8080/*'] });
    
    for (const tab of tabs) {
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getUserData' });
        if (response && response.userData) {
          return response.userData;
        }
      } catch (error) {
        // Tab might not have content script, try next tab
        continue;
      }
    }
    
    // Fallback: check localStorage sync data
    for (const tab of tabs) {
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'checkLocalStorage' });
        if (response && response.syncData) {
          const data = JSON.parse(response.syncData);
          return data;
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

// Periodic sync (every 1 minute to check focus mode status)
chrome.alarms.create('syncBlockedSites', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'syncBlockedSites') {
    if (userId) {
      syncFromSupabase();
    } else {
      // Try to get user ID from web app
      getUserDataFromWebApp().then((userData) => {
        if (userData && userData.userId) {
          userId = userData.userId;
          chrome.storage.local.set({ userId });
          syncFromSupabase();
        }
      });
    }
  }
});

// Check on extension startup (but don't spam)
// We'll rely on external messaging and manual sync instead
// checkLocalStorageSync();

// Sync when storage changes (from other extension instances)
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && (changes.userId || changes.focusMode)) {
    loadBlockedSites();
  }
});

