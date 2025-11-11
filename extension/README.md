# FocusSphere Browser Extension

This browser extension works with the FocusSphere web app to block distracting websites.

## Installation

1. Open Chrome/Edge and navigate to `chrome://extensions/` (or `edge://extensions/` for Edge)
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `extension` folder from this project
5. The extension will be installed and active

## Setup

1. After installing, click the extension icon
2. Click "Sync with App" to connect with your FocusSphere account
3. The extension will automatically block sites you've marked as blocked in the app

## How It Works

- The extension syncs with your FocusSphere app's blocked sites list
- When you try to visit a blocked site, you'll be redirected to a blocking page
- The extension respects your "Always Block" and "Focus Mode" settings
- Sites are blocked in real-time as you browse

## Syncing

- Click the extension icon and click "Sync with App" to update the blocked list
- The extension automatically syncs every 5 minutes
- You can also manually sync anytime

## Managing Blocked Sites

- Open the FocusSphere app at http://localhost:8080/blocker
- Add or remove sites from your blocked list
- Click "Sync with App" in the extension to update immediately

## Permissions

The extension requires:
- **Storage**: To cache your blocked sites list
- **Tabs**: To check and redirect blocked sites
- **Web Request**: To intercept and block requests to blocked domains
- **Alarms**: To periodically sync with the app

