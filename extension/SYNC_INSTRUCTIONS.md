# How to Sync Extension with Web App

## Quick Fix Steps:

1. **Reload the extension:**
   - Go to `chrome://extensions/`
   - Find "FocusSphere Blocker"
   - Click the reload button (circular arrow icon)

2. **Sync with your account:**
   - Click the extension icon in your browser toolbar
   - Click "Sync with App" button
   - The extension will:
     - Get your user ID from the web app
     - Fetch your blocked sites from Supabase
     - Check if focus mode is active
     - Update blocking rules

3. **Verify it's working:**
   - The popup should show "Blocked Sites: 1" (or more)
   - "Focus Mode" should show "Active" if you have focus mode on
   - Try visiting instagram.com - it should be blocked!

## How It Works:

- The extension checks Supabase every 1 minute for:
  - Your blocked apps list
  - Active focus sessions
- When focus mode is active, it blocks all apps with `block_mode = "focus"`
- Apps with `block_mode = "always"` are always blocked
- The extension uses a content script to read your user ID from the web app

## Troubleshooting:

If sync doesn't work:
1. Make sure you're logged into the web app
2. Make sure the web app tab is open (localhost:8080)
3. Click "Sync with App" in the extension popup
4. Check the browser console (F12) for any errors

