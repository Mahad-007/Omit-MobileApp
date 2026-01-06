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

    data.blockedApps.forEach((app) => {
      const domain = extractDomain(app.url);
      if (domain) {
        // Check blocking rules
        if (app.blocked && (app.blockMode === "always" || focusModeActive)) {
          blockedDomains.add(domain);
        }
      }
    });

    // Cache domains
    await chrome.storage.local.set({
      blockedSites: Array.from(blockedDomains),
    });
    console.log(
      `[FocusSphere] Updated ${blockedDomains.size} blocked domains from payload.`
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

// Time Tracking Logic
let pendingSavedHours = 0;
const TIME_TRACKING_ALARM = "trackTime";

chrome.alarms.create(TIME_TRACKING_ALARM, { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "syncBlockedSites") {
    getUserDataFromWebApp().catch(() => {
      // Silently ignore - app may not be open
    });
  } else if (alarm.name === TIME_TRACKING_ALARM) {
    await trackTimeSaved();
  }
});

async function trackTimeSaved() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length === 0) return;

    const currentUrl = tabs[0].url;
    if (!currentUrl) return;

    const domain = extractDomain(currentUrl);
    const isBlocked = domain && blockedDomains.has(domain);

    // Save time if:
    // 1. Focus Mode is ACTIVE (regardless of site)
    // 2. Focus Mode is INACTIVE AND site is NOT blocked
    // Note: If site is blocked and Focus Mode is active, user can't be there anyway (redirected).
    // If site is blocked and Focus Mode is inactive, user IS wasting time there -> No saved time.

    if (focusModeActive || (!focusModeActive && !isBlocked)) {
      // Add 1 minute (in hours)
      pendingSavedHours += 1 / 60;

      // Try to push to web app immediately
      await syncToWebApp();
    }
  } catch (e) {
    console.error("[FocusSphere] Error tracking time:", e);
  }
}

async function syncToWebApp() {
  if (pendingSavedHours <= 0) return;

  try {
    const tabs = await chrome.tabs.query({});
    let synced = false;

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
          await chrome.tabs.sendMessage(tab.id, {
            action: "addSavedTime",
            hours: pendingSavedHours,
          });
          synced = true;
        } catch (e) {
          // Tab might not be ready or not the right page, continue
        }
      }
    }

    if (synced) {
      console.log(
        `[FocusSphere] Synced ${pendingSavedHours.toFixed(4)} hours to web app`
      );
      pendingSavedHours = 0;
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
    if (domain && blockedDomains.has(domain)) {
        // Prepare notification
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon-128.png', // Fallback if no icon
            title: 'Focus Alert 🚫',
            message: `You are visiting a blocked site: ${domain}`,
            priority: 2
        });
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
            
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icon-128.png', 
                title: 'Task Reminder 📝',
                message: `Don't forget: ${task.title}`,
                priority: 1
            });
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
