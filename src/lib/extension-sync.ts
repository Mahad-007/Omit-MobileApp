// Helper functions to sync with the browser extension

export async function syncWithExtension(userId: string, focusModeActive: boolean) {
  // Try to send message to extension
  // Note: Extension ID will be different for each installation
  // We'll use chrome.runtime.sendMessage with a wildcard approach
  
  if (typeof chrome === 'undefined' || !chrome.runtime) {
    return { success: false, error: 'Extension not detected' };
  }

  try {
    // Store user ID and focus mode in extension storage
    // The extension will listen for these messages
    chrome.runtime.sendMessage(
      { 
        action: 'setUserId', 
        userId 
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('Extension communication error:', chrome.runtime.lastError);
          return { success: false, error: chrome.runtime.lastError.message };
        }
      }
    );

    chrome.runtime.sendMessage(
      { 
        action: 'setFocusMode', 
        active: focusModeActive 
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('Extension communication error:', chrome.runtime.lastError);
          return { success: false, error: chrome.runtime.lastError.message };
        }
      }
    );

    // Trigger sync
    chrome.runtime.sendMessage(
      { action: 'sync' },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('Extension communication error:', chrome.runtime.lastError);
          return { success: false, error: chrome.runtime.lastError.message };
        }
        return { success: true };
      }
    );

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export function isExtensionInstalled(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.runtime;
}

