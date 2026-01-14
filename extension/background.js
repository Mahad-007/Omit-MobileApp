// FocusSphere Blocker Extension
// This extension syncs with your FocusSphere app to block distracting websites

// Removed Supabase dependencies as we now sync directly from the web app's local storage
// const SUPABASE_URL = '...';
// const SUPABASE_ANON_KEY = '...';

let blockedDomains = new Set();
let distractingDomains = new Set(); // ALL sites in block list (for wasted time tracking, regardless of block mode)
let focusModeActive = false;
let userId = null;
let accessToken = null;

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log("FocusSphere Blocker installed");
  loadBlockedSites();

  // Try to get user data from web app on install
  setTimeout(() => {
    getUserDataFromWebApp().catch(() => {
      // Silently ignore - app may not be open yet
    });
  }, 2000);
});

// Also try to get user data when extension starts
chrome.runtime.onStartup.addListener(() => {
  setTimeout(() => {
    getUserDataFromWebApp().catch(() => {
      // Silently ignore - app may not be open yet
    });
  }, 2000);
});

// Load blocked sites and tasks from storage
async function loadBlockedSites() {
  try {
    const result = await chrome.storage.local.get([
      "userId",
      "accessToken",
      "blockedSites",
      "distractingSites",
      "focusMode",
      "tasks",
    ]);
    userId = result.userId;
    accessToken = result.accessToken;
    focusModeActive = result.focusMode || false;

    if (result.blockedSites) {
      blockedDomains = new Set(result.blockedSites);
      await updateBlockingRules();
      await checkAndUnblockTabs();
    }
    
    if (result.distractingSites) {
      distractingDomains = new Set(result.distractingSites);
    }
  } catch (error) {
    console.error("Error loading data:", error);
  }
}

// Sync from payload provided by web app
async function syncFromPayload(data) {
  if (!data) return;

  console.log("[FocusSphere] Syncing from payload:", data);

  if (data.userId) userId = data.userId;
  if (data.accessToken) accessToken = data.accessToken;
  if (typeof data.focusMode === "boolean") focusModeActive = data.focusMode;

  const updates = {
    userId,
    accessToken,
    focusMode: focusModeActive,
  };

  // Save tasks if provided
  if (data.tasks) {
    updates.tasks = data.tasks;
    console.log(
      `[FocusSphere] Received ${data.tasks.length} tasks from payload.`
    );
  } else {
    console.log("[FocusSphere] No tasks in payload.");
  }

  // Save state
  await chrome.storage.local.set(updates);

  // Process blocked apps if provided
  if (data.blockedApps && Array.isArray(data.blockedApps)) {
    blockedDomains.clear();
    distractingDomains.clear(); // Clear and rebuild the distracting sites list

    data.blockedApps.forEach((app) => {
      const domain = extractDomain(app.url);
      if (domain) {
        // Add ALL blocked apps to distracting domains (for wasted time tracking)
        if (app.blocked) {
          distractingDomains.add(domain);
        }
        
        // Only add to blockedDomains if actively blocked right now
        if (app.blocked && (app.blockMode === "always" || focusModeActive)) {
          blockedDomains.add(domain);
        }
      }
    });

    // Cache domains
    await chrome.storage.local.set({
      blockedSites: Array.from(blockedDomains),
      distractingSites: Array.from(distractingDomains), // Also cache distracting sites
    });
    console.log(
      `[FocusSphere] Updated ${blockedDomains.size} blocked domains, ${distractingDomains.size} distracting domains from payload.`
    );

    // Update rules
    await updateBlockingRules();
    
    // Check for unblocking (e.g. Focus Mode ended or site removed)
    await checkAndUnblockTabs();
    
    // Check for blocking (e.g. Focus Mode started or site added)
    await checkAndBlockTabs();
  }
}

// Extract domain from URL
function extractDomain(url) {
  try {
    if (!url) return null;
    // Lowercase first to handle "YouTube.com"
    let domain = url.toLowerCase();
    
    // Remove protocol
    domain = domain.replace(/^https?:\/\//, "");
    // Remove www.
    domain = domain.replace(/^www\./, "");
    // Remove path and query parameters
    domain = domain.split("/")[0];
    domain = domain.split("?")[0];
    // Remove port
    domain = domain.split(":")[0];
    
    return domain;
  } catch (error) {
    return null;
  }
}

// Update blocking rules using declarativeNetRequest API (Manifest V3)
async function updateBlockingRules() {
  try {
    // Fetch currently active dynamic rules to identify what needs to be removed
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existingRules.map((rule) => rule.id);

    // Create new rules for currently blocked domains
    const addRules = [];
    let ruleId = 1;

    for (const domain of blockedDomains) {
      addRules.push({
        id: ruleId++,
        priority: 1,
        action: {
          type: "redirect",
          redirect: {
            url: chrome.runtime.getURL(
              `blocked.html?site=${encodeURIComponent(domain)}`
            ),
          },
        },
        condition: {
          urlFilter: `||${domain}`,
          resourceTypes: ["main_frame"],
        },
      });
    }

    // Perform atomic update: remove old rules AND add new rules in one call
    // This prevents race conditions where an ID is added before it successfully removed in a separate call
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: removeRuleIds,
      addRules: addRules,
    });

    console.log(
      `[FocusSphere] rules updated. Removed ${removeRuleIds.length}, Added ${addRules.length}`
    );
  } catch (error) {
    console.error("[FocusSphere] Error updating blocking rules:", error);
  }
}

// Check and unblock tabs that are no longer in the blocked list
async function checkAndUnblockTabs() {
  try {
    const tabs = await chrome.tabs.query({});
    const blockedUrlPattern = chrome.runtime.getURL("blocked.html");

    for (const tab of tabs) {
      if (tab.url && tab.url.startsWith(blockedUrlPattern)) {
        const url = new URL(tab.url);
        const site = url.searchParams.get("site");

        if (site && !blockedDomains.has(site)) {
          // Site is no longer blocked, redirect back
          const newUrl = `https://${site}`;
          await chrome.tabs.update(tab.id, { url: newUrl });
        }
      }
    }
  } catch (error) {
    console.error("[FocusSphere] Error unblocking tabs:", error);
  }
}

// Check and block currently open tabs that match the blocklist
// This ensures that if a user has a tab open and then blocks the site, it gets redirected immediately
async function checkAndBlockTabs() {
  try {
    const tabs = await chrome.tabs.query({});
    const blockedUrlPattern = chrome.runtime.getURL("blocked.html");

    for (const tab of tabs) {
      if (!tab.url || tab.url.startsWith(blockedUrlPattern)) continue;

      const domain = extractDomain(tab.url);
      if (domain && blockedDomains.has(domain)) {
        const redirectUrl = chrome.runtime.getURL(
            `blocked.html?site=${encodeURIComponent(domain)}`
        );
        await chrome.tabs.update(tab.id, { url: redirectUrl });
      }
    }
  } catch (error) {
    console.error("[FocusSphere] Error blocking existing tabs:", error);
  }
}

// Helper to check if a visited domain matches any distracting domain (including subdomains)
function isMatchingDomain(visitedDomain, blockedDomain) {
  if (!visitedDomain || !blockedDomain) return false;
  
  // Exact match
  if (visitedDomain === blockedDomain) return true;
  
  // Check if visited domain is a subdomain of blocked domain
  // e.g., "m.youtube.com" should match "youtube.com"
  if (visitedDomain.endsWith('.' + blockedDomain)) return true;
  
  return false;
}

function isDomainInSet(domain, domainSet) {
  if (!domain) return false;
  
  for (const blockedDomain of domainSet) {
    if (isMatchingDomain(domain, blockedDomain)) {
      return true;
    }
  }
  return false;
}

// Time Tracking Logic - Tab-based approach
let pendingSavedHours = 0;
let pendingWastedHours = 0;
let sessionWastedMinutes = 0; // Track total wasted minutes in current session for notifications
let lastNotificationThreshold = 0; // Track which threshold we last notified at (10, 20, 30, etc.)

// Tab-based time tracking state
let currentTrackingState = {
  tabId: null,
  domain: null,
  startTime: null,
  isWasting: false
};

// Load pending time from storage on startup
chrome.storage.local.get(['pendingSavedHours', 'pendingWastedHours', 'sessionWastedMinutes', 'lastNotificationThreshold', 'currentTrackingState'], (result) => {
  if (result.pendingSavedHours) pendingSavedHours = result.pendingSavedHours;
  if (result.pendingWastedHours) pendingWastedHours = result.pendingWastedHours;
  if (result.sessionWastedMinutes) sessionWastedMinutes = result.sessionWastedMinutes;
  if (result.lastNotificationThreshold) lastNotificationThreshold = result.lastNotificationThreshold;
  if (result.currentTrackingState) currentTrackingState = result.currentTrackingState;
  console.log(`[FocusSphere] Loaded pending time: saved=${pendingSavedHours.toFixed(4)}h, wasted=${pendingWastedHours.toFixed(4)}h`);
  
  // Resume tracking if we were on a distracting site when extension reloaded
  if (currentTrackingState.startTime && currentTrackingState.isWasting) {
    console.log(`[FocusSphere] Resuming tracking from previous session`);
  }
});

// Save pending time to storage periodically
async function savePendingTime() {
  await chrome.storage.local.set({
    pendingSavedHours,
    pendingWastedHours,
    sessionWastedMinutes,
    lastNotificationThreshold,
    currentTrackingState
  });
}

// Check if a URL is a distracting site
function isDistractingUrl(url) {
  if (!url) return false;
  
  const domain = extractDomain(url);
  const isDistractingSite = isDomainInSet(domain, distractingDomains);
  const isBlockedPage = url.includes(chrome.runtime.getURL("blocked.html"));
  
  return isDistractingSite || isBlockedPage;
}

// Start tracking time on a distracting site
function startWastedTimeTracking(tabId, url) {
  const domain = extractDomain(url);
  
  // If already tracking this tab, don't restart
  if (currentTrackingState.tabId === tabId && currentTrackingState.isWasting) {
    return;
  }
  
  // First, finalize any previous tracking
  finalizeCurrentTracking();
  
  currentTrackingState = {
    tabId: tabId,
    domain: domain,
    startTime: Date.now(),
    isWasting: true
  };
  
  console.log(`[FocusSphere] Started tracking wasted time on: ${domain}`);
  savePendingTime();
}

// Start tracking saved time (productive browsing)
function startSavedTimeTracking(tabId, url) {
  const domain = extractDomain(url);
  
  // If already tracking this tab as productive, don't restart
  if (currentTrackingState.tabId === tabId && !currentTrackingState.isWasting) {
    return;
  }
  
  // First, finalize any previous tracking
  finalizeCurrentTracking();
  
  currentTrackingState = {
    tabId: tabId,
    domain: domain,
    startTime: Date.now(),
    isWasting: false
  };
  
  console.log(`[FocusSphere] Started tracking saved time on: ${domain}`);
  savePendingTime();
}

// Finalize current tracking and add time to pending totals
function finalizeCurrentTracking() {
  if (!currentTrackingState.startTime) return;
  
  const elapsedMs = Date.now() - currentTrackingState.startTime;
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  const elapsedMinutes = elapsedMs / (1000 * 60);
  
  // Only count if at least 1 second has passed
  if (elapsedMs < 1000) return;
  
  if (currentTrackingState.isWasting) {
    pendingWastedHours += elapsedHours;
    sessionWastedMinutes += elapsedMinutes;
    console.log(`[FocusSphere] Added ${(elapsedMinutes).toFixed(2)} minutes of wasted time (${currentTrackingState.domain}). Total pending: ${pendingWastedHours.toFixed(4)}h`);
    
    // Check notification threshold
    const currentThreshold = Math.floor(sessionWastedMinutes / 10) * 10;
    if (currentThreshold > 0 && currentThreshold > lastNotificationThreshold) {
      lastNotificationThreshold = currentThreshold;
      // Use a data URL for the icon since no icon file exists
      const iconDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAACXBIWXMAAAsTAAALEwEAmpwYAAAF8WlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNy4xLWMwMDAgNzkuZWRhMmIzZmFjLCAyMDIxLzExLzE3LTE3OjIzOjE5ICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgMjMuMSAoV2luZG93cykiIHhtcDpDcmVhdGVEYXRlPSIyMDIyLTAxLTAxVDEyOjAwOjAwWiIgeG1wOk1vZGlmeURhdGU9IjIwMjItMDEtMDFUMTI6MDA6MDBaIiB4bXA6TWV0YWRhdGFEYXRlPSIyMDIyLTAxLTAxVDEyOjAwOjAwWiIgZGM6Zm9ybWF0PSJpbWFnZS9wbmciIHBob3Rvc2hvcDpDb2xvck1vZGU9IjMiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6MDAwMDAwMDAtMDAwMC0wMDAwLTAwMDAtMDAwMDAwMDAwMDAwIiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOjAwMDAwMDAwLTAwMDAtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMCIgeG1wTU06T3JpZ2luYWxEb2N1bWVudElEPSJ4bXAuZGlkOjAwMDAwMDAwLTAwMDAtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMCI+IDx4bXBNTTpIaXN0b3J5PiA8cmRmOlNlcT4gPHJkZjpsaSBzdEV2dDphY3Rpb249ImNyZWF0ZWQiIHN0RXZ0Omluc3RhbmNlSUQ9InhtcC5paWQ6MDAwMDAwMDAtMDAwMC0wMDAwLTAwMDAtMDAwMDAwMDAwMDAwIiBzdEV2dDp3aGVuPSIyMDIyLTAxLTAxVDEyOjAwOjAwWiIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIDIzLjEgKFdpbmRvd3MpIi8+IDwvcmRmOlNlcT4gPC94bXBNTTpIaXN0b3J5PiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PgICAgICAgICAgICAyAAAADklEQVR42mJgGAWjYBT8PwAAfwAB/YXnAgAAAABJRU5ErkJggg==';
      chrome.notifications.create(`wasted-time-${currentThreshold}`, {
        type: 'basic',
        iconUrl: iconDataUrl,
        title: 'Time Wasted ⏰',
        message: `You've wasted ${Math.round(sessionWastedMinutes)} minutes on blocked sites today. Time to refocus!`,
        priority: 2
      });
      console.log('[FocusSphere] Created wasted time notification');
    }
  } else {
    pendingSavedHours += elapsedHours;
    console.log(`[FocusSphere] Added ${(elapsedMinutes).toFixed(2)} minutes of saved time (${currentTrackingState.domain}). Total pending: ${pendingSavedHours.toFixed(4)}h`);
  }
  
  // Reset tracking state
  currentTrackingState = {
    tabId: null,
    domain: null,
    startTime: null,
    isWasting: false
  };
  
  savePendingTime();
  
  // Try to sync to web app immediately
  syncToWebApp();
}

// Handle tab activation (user switches tabs)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    handleTabChange(tab.id, tab.url);
  } catch (e) {
    console.log('[FocusSphere] Error getting activated tab:', e);
  }
});

// Handle tab URL changes (navigation within tab)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only track when the page has finished loading
  if (changeInfo.status === 'complete' && tab.active) {
    handleTabChange(tabId, tab.url);
  }
});

// Handle window focus changes
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // User left Chrome, finalize tracking
    finalizeCurrentTracking();
  } else {
    // User returned to Chrome, check active tab
    try {
      const tabs = await chrome.tabs.query({ active: true, windowId: windowId });
      if (tabs.length > 0) {
        handleTabChange(tabs[0].id, tabs[0].url);
      }
    } catch (e) {
      console.log('[FocusSphere] Error handling window focus:', e);
    }
  }
});

// Central handler for tab changes
function handleTabChange(tabId, url) {
  if (!url) {
    finalizeCurrentTracking();
    return;
  }
  
  // Skip chrome:// and other internal pages
  if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') && !url.includes('blocked.html')) {
    finalizeCurrentTracking();
    return;
  }
  
  if (isDistractingUrl(url)) {
    startWastedTimeTracking(tabId, url);
  } else {
    startSavedTimeTracking(tabId, url);
  }
}

// Keep a periodic sync as backup (every 1 minute)
const TIME_TRACKING_ALARM = "trackTime";
chrome.alarms.create(TIME_TRACKING_ALARM, { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "syncBlockedSites") {
    getUserDataFromWebApp().catch(() => {
      // Silently ignore - app may not be open
    });
  } else if (alarm.name === TIME_TRACKING_ALARM) {
    // Periodic sync - finalize current tracking and sync
    if (currentTrackingState.startTime) {
      // Calculate time so far without resetting the start time
      const elapsedMs = Date.now() - currentTrackingState.startTime;
      const elapsedHours = elapsedMs / (1000 * 60 * 60);
      const elapsedMinutes = elapsedMs / (1000 * 60);
      
      if (elapsedMs >= 1000) {
        if (currentTrackingState.isWasting) {
          pendingWastedHours += elapsedHours;
          sessionWastedMinutes += elapsedMinutes;
          console.log(`[FocusSphere] Periodic sync: added ${elapsedMinutes.toFixed(2)} min wasted time`);
        } else {
          pendingSavedHours += elapsedHours;
          console.log(`[FocusSphere] Periodic sync: added ${elapsedMinutes.toFixed(2)} min saved time`);
        }
        
        // Reset start time to now (so we don't double-count)
        currentTrackingState.startTime = Date.now();
        await savePendingTime();
        await syncToWebApp();
      }
    }
  }
});

async function syncToWebApp() {
  if (pendingSavedHours <= 0 && pendingWastedHours <= 0) return;

  try {
    const tabs = await chrome.tabs.query({});
    let syncedSaved = false;
    let syncedWasted = false;

    // Find tabs managed by the app
    const appOrigins = [
      "http://localhost:8080",
      "http://127.0.0.1:8080",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "https://omit.software",
      "https://www.omit.software",
    ];

    for (const tab of tabs) {
      if (!tab.url) continue;
      const origin = new URL(tab.url).origin;

      if (appOrigins.includes(origin)) {
        try {
          // Sync saved time
          if (pendingSavedHours > 0) {
            await chrome.tabs.sendMessage(tab.id, {
              action: "addSavedTime",
              hours: pendingSavedHours,
            });
            syncedSaved = true;
          }
          
          // Sync wasted time
          if (pendingWastedHours > 0) {
            await chrome.tabs.sendMessage(tab.id, {
              action: "addWastedTime",
              hours: pendingWastedHours,
            });
            syncedWasted = true;
          }
        } catch (e) {
          // Tab might not be ready or not the right page, continue
        }
      }
    }

    if (syncedSaved) {
      console.log(
        `[FocusSphere] Synced ${pendingSavedHours.toFixed(4)} saved hours to web app`
      );
      pendingSavedHours = 0;
    }
    
    if (syncedWasted) {
      console.log(
        `[FocusSphere] Synced ${pendingWastedHours.toFixed(4)} wasted hours to web app`
      );
      pendingWastedHours = 0;
    }
    
    // Save zeroed values to storage after successful sync
    if (syncedSaved || syncedWasted) {
      await savePendingTime();
    }
  } catch (e) {
    console.error("[FocusSphere] Error syncing time to web app:", e);
  }
}

// Listen for messages from popup, content scripts, or external sources
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    // User asking to check local storage of the web page
    if (request.action === "sync") {
      getUserDataFromWebApp()
        .then((data) => {
          if (data) {
            syncFromPayload(data);
            // Also try to push any pending time
            syncToWebApp();
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: "No data found in App" });
          }
        })
        .catch((error) => {
            console.error("Sync error:", error);
            let msg = "Sync Error";
            if (error.message === "App not open") msg = "App not open";
            if (error.message === "Reload App") msg = "Reload App";
            
            sendResponse({ success: false, error: msg });
        });
      return true;
    }

    if (request.action === "setUserId" || request.action === "setFocusMode") {
      // Just force a full sync check
      getUserDataFromWebApp().then((data) => {
        if (data) {
          syncFromPayload(data);
          sendResponse({ success: true });
        }
      }).catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
      return true;
    }

    if (request.action === "getStatus") {
      sendResponse({
        blockedCount: blockedDomains.size,
        focusMode: focusModeActive,
        userId: userId,
      });
      return false;
    }

    // Handle request for pending time from web app
    if (request.action === "getPendingTime") {
      sendResponse({
        savedHours: pendingSavedHours,
        wastedHours: pendingWastedHours
      });
      // Clear pending time after sending
      pendingSavedHours = 0;
      pendingWastedHours = 0;
      savePendingTime(); // Persist the reset
      return false;
    }

    // Handle new closeTab action
    if (request.action === "closeTab") {
      if (sender.tab && sender.tab.id) {
        chrome.tabs.remove(sender.tab.id);
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: "No tab found" });
      }
      return true;
    }

    // Handle direct sync data update
    if (request.action === "updateSyncData" && request.syncData) {
      syncFromPayload(request.syncData);
      sendResponse({ success: true });
      return true;
    }

    if (request.action === 'getUserDataFromWebApp') {
      getUserDataFromWebApp().then(data => {
        sendResponse({ userData: data });
      }).catch((error) => {
        sendResponse({ userData: null, error: error.message });
      });
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error handling message:", error);
    sendResponse({ success: false, error: error.message });
    return false;
  }
});

// Allow external messaging from the web app
chrome.runtime.onMessageExternal.addListener(
  (request, sender, sendResponse) => {
    const allowedOrigins = [
      "http://localhost:8080",
      "http://127.0.0.1:8080",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "https://omit.software",
      "https://www.omit.software",
    ];
    if (!allowedOrigins.some((origin) => sender.origin.startsWith(origin))) {
      sendResponse({ success: false, error: "Unauthorized origin" });
      return false;
    }

    // If the web app sends the data directly, use it
    // We can modify the extension-sync.ts to send 'updateBlockedSites' with payload
    // Or just rely on the existing 'sync' action triggering a read from storage.

    if (
      request.action === "sync" ||
      request.action === "setUserId" ||
      request.action === "setFocusMode"
    ) {
      // Fetch latest from page
      getUserDataFromWebApp().then((data) => {
        if (data) {
          syncFromPayload(data);
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: "No data found" });
        }
      }).catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
      return true;
    }

    sendResponse({ success: false, error: "Unknown action" });
    return false;
  }
);

// Get user data from web app via content script
async function getUserDataFromWebApp() {
  try {
    const tabs = await chrome.tabs.query({});
    let checkedCount = 0;
    let appTabFound = false;
    let appTabResponsive = false;

    // Check localStorage sync data
    for (const tab of tabs) {
      // optimization: only check tabs that match our app origins
      if (tab.url && (
          tab.url.includes("localhost:5173") || 
          tab.url.includes("omit.software") || 
          tab.url.includes("www.omit.software") ||
          tab.url.includes("127.0.0.1:5173")
      )) {
          appTabFound = true;
          try {
            const response = await chrome.tabs.sendMessage(tab.id, {
              action: "checkLocalStorage",
            });
            appTabResponsive = true;
            checkedCount++;
            
            if (response && response.syncData) {
              const data = JSON.parse(response.syncData);
              if (data) {
                await syncFromPayload(data);
                return data;
              }
            }
          } catch (error) {
            // Tab might be loading or content script not ready
            console.log("Error checking tab " + tab.id, error);
            continue;
          }
      }
    }
    
    if (!appTabFound) {
        throw new Error("App not open");
    }

    if (!appTabResponsive) {
        throw new Error("Reload App");
    }
    
    return null; // App responsive but no data found
  } catch (error) {
    if (error.message === "App not open" || error.message === "Reload App") throw error;
    console.error("Error getting user data from web app:", error);
    return null;
  }
}

// Periodic check
chrome.alarms.create("syncBlockedSites", { periodInMinutes: 1 });
// Note: The syncBlockedSites alarm is handled in the first onAlarm listener above

chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local") {
        if (changes.userId || changes.focusMode) {
            loadBlockedSites();
            // loadBlockedSites calls checkAndUnblockTabs internally now
        }
        if (changes.settings) {
            settings = changes.settings.newValue;
            // If reminders turned on/off, manage the alarm
            manageReminderAlarm(); 
        }
    }
});

// --- NEW FEATURES: Task Reminders & Focus Alerts ---

let settings = {
    taskReminders: true,
    focusAlerts: true
};

// 1. Focus Alerts (Web Navigation)
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
    if (details.frameId !== 0) return; // Main frame only
    
    // Check if feature enabled
    if (!settings.focusAlerts) return;

    const domain = extractDomain(details.url);
    if (isDomainInSet(domain, blockedDomains)) {
        // Prepare notification with data URL icon
        const iconDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAGLSURBVFhH7ZY9TsNAEIXXDhJCNByBggNQcQQKjoAERRoKJI5AwRFoKDgCBUegouAINBScgIIjxHm8M45JYuzd2F7+pE+x117P25mdWSchBIP/jJAKpRg2C6lQisO4OQvPIuBHPMqKL5EpJ+F5BE55lBV3IuBJ+AcBPyLgRRT8hYBXUSCfCXkWBfKZEM+iwJsI8CYC3kTAiwjwJgp8EgU+iQJvIsCbCPAmAryJAm8iwJsI8CYCvIkCbyLAmwjwJgJ+RIA3EeBNFPgkCnyKAp9EgU+iwCdR4FMU+BQFPkWBT1HgUxT4FAU+RYFPUeBTFHgTAd5EgDcR4E0EeBMB3kSBN1HgTRR4EwXeRIE3UeBNFHgTBd5EgTdR4E0UeBMF3kSBN1HgTRR4EwXeRIE3UeBdhHoVAbfC30XAtfB3EXAV8l0EdCH8XQRciYAbEeBKBLgSAa5EgCsR4EoEuBIBrkSAKxHgSgS4EgGuRIArEeBKBLgSAf8iwIsI8CICvIgAL6LAiyj4G4F/FQkh/AF9ywR8i4eZuwAAAABJRU5ErkJggg==';
        chrome.notifications.create(`focus-alert-${Date.now()}`, {
            type: 'basic',
            iconUrl: iconDataUrl,
            title: 'Focus Alert 🚫',
            message: `You are visiting a blocked site: ${domain}`,
            priority: 2
        });
        console.log('[FocusSphere] Created focus alert notification');
    }
});

// 2. Task Reminders (Random 5-30 min)
const REMINDER_ALARM = "taskReminder";

function manageReminderAlarm() {
    chrome.alarms.get(REMINDER_ALARM, (alarm) => {
        if (settings.taskReminders) {
            if (!alarm) {
                scheduleNextReminder();
            }
        } else {
            chrome.alarms.clear(REMINDER_ALARM);
        }
    });
}

function scheduleNextReminder() {
    // Random delay between 5 and 30 minutes
    const delayMinutes = 5 + Math.random() * 25; 
    chrome.alarms.create(REMINDER_ALARM, { delayInMinutes: delayMinutes });
    console.log(`[FocusSphere] Next reminder in ${delayMinutes.toFixed(1)} minutes`);
}

// Note: All alarm handlers are consolidated in the first onAlarm listener at line 237
// Adding the REMINDER_ALARM case there
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === REMINDER_ALARM) {
        await checkTaskReminders();
        scheduleNextReminder(); // Reschedule after firing
    }
  });

async function checkTaskReminders() {
    if (!settings.taskReminders) return;

    try {
        const result = await chrome.storage.local.get("tasks");
        const tasks = result.tasks || [];
        
        // Filter for uncompleted tasks
        const uncompleted = tasks.filter(t => !t.completed);
        
        if (uncompleted.length > 0) {
            // Pick one randomly
            const task = uncompleted[Math.floor(Math.random() * uncompleted.length)];
            
            // Use data URL icon
            const iconDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAGLSURBVFhH7ZY9TsNAEIXXDhJCNByBggNQcQQKjoAERRoKJI5AwRFoKDgCBUegouAINBScgIIjxHm8M45JYuzd2F7+pE+x117P25mdWSchBIP/jJAKpRg2C6lQisO4OQvPIuBHPMqKL5EpJ+F5BE55lBV3IuBJ+AcBPyLgRRT8hYBXUSCfCXkWBfKZEM+iwJsI8CYC3kTAiwjwJgp8EgU+iQJvIsCbCPAmAryJAm8iwJsI8CYCvIkCbyLAmwjwJgJ+RIA3EeBNFPgkCnyKAp9EgU+iwCdR4FMU+BQFPkWBT1HgUxT4FAU+RYFPUeBTFHgTAd5EgDcR4E0EeBMB3kSBN1HgTRR4EwXeRIE3UeBNFHgTBd5EgTdR4E0UeBMF3kSBN1HgTRR4EwXeRIE3UeBdhHoVAbfC30XAtfB3EXAV8l0EdCH8XQRciYAbEeBKBLgSAa5EgCsR4EoEuBIBrkSAKxHgSgS4EgGuRIArEeBKBLgSAf8iwIsI8CICvIgAL6LAiyj4G4F/FQkh/AF9ywR8i4eZuwAAAABJRU5ErkJggg==';
            chrome.notifications.create(`task-reminder-${Date.now()}`, {
                type: 'basic',
                iconUrl: iconDataUrl,
                title: 'Task Reminder 📝',
                message: `Don't forget: ${task.title}`,
                priority: 1
            });
            console.log('[FocusSphere] Created task reminder notification');
        }
    } catch (e) {
        console.error("Error checking task reminders:", e);
    }
}

// Ensure settings loaded on startup
chrome.storage.local.get("settings", (res) => {
    if (res.settings) {
        settings = res.settings;
        manageReminderAlarm();
    }
});
