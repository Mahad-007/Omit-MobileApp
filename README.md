# Omit | Premium Focus & Productivity Assistant

<div align="center">

**Redefine Your Relationship with Technology**

[![Built with Vite](https://img.shields.io/badge/Built%20with-Vite-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-18.3.1-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Capacitor](https://img.shields.io/badge/Capacitor-8.0.1-04A39C.svg?logo=capacitor&logoColor=white)](https://capacitorjs.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.4.17-38BDF8.svg?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[🌐 Live Web Demo](https://omit-prod.vercel.app) • [📱 Android APK](https://github.com/your-org/omit-mobileapp/releases) • [📖 Documentation](https://docs.omit.app)

</div>

---

## 📱 Executive Overview

**Omit** is a next-generation digital wellness platform that transforms focus from a fleeting aspiration into a sustainable, elegant habit. Unlike blunt-force app blockers that breed resentment, Omit employs a **human-centered design philosophy** combined with **military-grade Android accessibility services** to create a frictionless, almost zen-like experience of digital minimalism.

### The Problem We Solve

The average knowledge worker checks their phone **96 times daily** and loses **23 hours per month** to digital distractions. Existing solutions are either:
- ❌ **Too harsh** (full device lockdowns that trigger reactance)
- ❌ **Too weak** (simple timers easily circumvented)
- ❌ **Aesthetic afterthoughts** (jarring, clinical interfaces that feel punitive)

### Our Solution

Omit introduces **Graceful Interception™** — a proprietary system that:
1. **Prevents distraction before it happens** via predictive app monitoring
2. **Provides elegant, non-judgmental overlays** when blocked apps are launched
3. **Gamifies focus** with insights, streaks, and adaptive challenges
4. **Respects user autonomy** with "strict mode" vs "gentle mode" paradigms

Built with a **mobile-first, cross-platform architecture** (React + Capacitor), Omit delivers a **native-performance experience** wrapped in a meticulously crafted UI that makes focus feel luxurious rather than punitive.

---

## ✨ Key Features

### 🛡️ **Intelligent App Blocking Engine**
- **Real-time window monitoring** via Android AccessibilityService (detects app switches with 50ms latency)
- **Per-app cooldown timers** (2-second dismissal buffer prevents rapid re-triggering)
- **Dynamic blocklists** organized by category (Social, Entertainment, Communication)
- **Strict Mode toggle** — once a session starts, you CANNOT disable it (for true deep work)
- **Graceful dismissal** — "Back to Work" button with built-in 5-minute cooldown

### ⏱️ **Immersive Focus Timer**
- **Circular progress visualization** with SVG stroke-dashoffset animation (60fps)
- **Session type differentiation** (Deep Work vs Shallow Work color coding)
- **Task-context coupling** — associate each timer with a specific task from your inbox
- **Auto-rolling sessions** — chains 25-minute Pomodoro blocks automatically
- **Haptic feedback** on Android for session start/stop

### 📊 **Productivity Intelligence**
- **Usage tracking analytics** — measures time spent per app with background broadcasting
- **Weekly breakdowns** (Deep Work vs Shallow Work percentages)
- **Focus Score algorithm** (weighted by session length, consistency, and task completion)
- **Pro Insights** — AI-driven recommendations like *"Your best focus time is Tuesday 8-11AM"*
- **Trend visualization** — custom Recharts area graphs with gradient fills

### ✅ **Unified Task Management**
- **Quick-add modal** with keyboard shortcuts (⌘+Enter to save)
- **Priority tagging** (gold indicator for critical tasks)
- **Drag-reorder support** (visual drag handle on hover)
- **Natural language parsing** (e.g., "Review PR tomorrow at 3pm")
- **Inbox zero gamification** with completion animations

### 🌐 **Cross-Platform Ecosystem**
- **Web Dashboard** (Vercel/Netlify deployable) for desktop planning
- **Android native overlay** with foreground service and notification persistence
- **iOS support** in progress (uses different interception APIs)
- **Chrome Extension** for website blocking (redirects to `blocked.html` with site context)

### 🎨 **Premium Design System**
- **Zen Luxury aesthetic** — deep indigo/slate palette with warm amber accents
- **Glassmorphism** with `backdrop-filter: blur(28px)` and HSLA transparency
- **Custom iOS-style bottom navigation** with safe-area insets
- **Material Symbols** icon set with variable font weight (FILL 0..1)
- **Adaptive spacing** — tight on 360px width devices, generous on tablets

---

## 👥 Target Users & Value Proposition

### Primary User Persona
| Role | Pain Points | Omit's Value |
|------|-------------|--------------|
| **Software Engineers** | Context-switching between IDE, Slack, Twitter | *Deep Work sessions* block social/media; timer links to GitHub branch |
| **Students & Academics** | Procrastination on phone during study | *Strict Mode* prevents session cancellation; app blocking during lectures |
| **Remote Workers** | Household distractions, news sites | *Website blocking* via Chrome extension; focus dashboard shows daily goals |
| **Product Managers** | Constant meeting context-switches | *Shallow Work tracking*; calendar integration in roadmap |
| **Writers & Creatives** | Perfectionist distraction loops | *Gentle Mode* allows brief breaks; insights show peak creative hours |

### Enterprise Use Cases
- **Team accountability** — share focus stats in Slack (Omit → Slack integration planned)
- **Manager dashboards** — anonymized team focus metrics (respecting privacy)
- **Custom blocklists** per department (Sales: block LinkedIn during prospecting hours)

### ROI for Organizations
> Based on a 50-person team averaging 2h distractions/day at $75/h blended rate:
> - **Annual waste**: $1,825 × 50 = **$91,250**
> - With Omit (conservative 40% reduction): **$36,500 saved annually**
> - Plus: improved sprint velocity, fewer deadline fires, better work-life balance.

---

## 🏗️ Technical Architecture

### System Overview

```mermaid
graph TB
    subgraph "Web Frontend (React/Vite)"
        A[Focus Dashboard] --> B[Focus Timer]
        A --> C[Task Inbox]
        A --> D[Insights]
        A --> E[Settings]
    end

    subgraph "Capacitor Bridge"
        F[AppBlockerPlugin]
        G[Preferences Plugin]
        H[Local Notifications]
    end

    subgraph "Android Native Layer"
        I[AppBlockerService<br/>AccessibilityService]
        J[BlockingOverlayService<br/>Foreground Service]
        K[PackageManager<br/>Icon extraction]
    end

    subgraph "State & Analytics"
        L[SharedPreferences]
        M[Broadcast Bus]
        N[Supabase (cloud sync)]
    end

    A -.- F
    F -.-> I
    I -.-> J
    J --> K
    F -.-> L
    I -.-> M
    M --> N
```

### Frontend Stack (Web + Mobile)

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Build Tool** | Vite 7.3.1 | Lightning-fast HMR, optimized production bundles |
| **Framework** | React 18.3.1 (with React Router 6.30) | Client-side routing, component lifecycle |
| **Language** | TypeScript 5.8.3 | Strict typing for plugin interfaces & state |
| **Styling** | Tailwind CSS 3.4.17 + shadcn/ui | Utility-first, component-accelerated design |
| **UI Components** | Radix UI primitives + custom | Accessible, unstyled base (accordion, dialog, slider) |
| **State Management** | React Context + localStorage | Local persistence; optional Zustand/Redux in roadmap |
| **Charts** | Recharts 2.15.4 | SVG-based focus trend visualizations |
| **Icons** | Lucide React + Material Symbols | Consistent iconography across platforms |
| **Animations** | Tailwind `transition-*` + custom CSS | Smooth state transitions, modal appearances |

### Native Android Layer (Java)

**1. `AppBlockerPlugin` (Capacitor Plugin)**
- **Purpose**: JavaScript ↔ Java bridge
- **Key methods**:
  - `setBlockedApps()` — persists blocklist to SharedPreferences
  - `startMonitoring()` / `stopMonitoring()` — toggles AccessibilityService
  - `checkPermissions()` — returns `{ accessibility, usageStats, overlay }`
  - `getInstalledApps()` — returns `[{ packageName, appName, iconBase64 }]`
- **Performance**: ExecutorService for async icon loading (2 threads)

**2. `AppBlockerService` (AccessibilityService)**
- **Event Types**: `TYPE_WINDOW_STATE_CHANGED` + `TYPE_NOTIFICATION_STATE_CHANGED`
- **Debouncing**: 50ms delay to avoid false triggers during app switches
- **Cooldown**: 2-second per-package dismissal buffer
- **Usage Tracking**: Broadcasts `"com.omit.app.USAGE_UPDATE"` with `{packageName, duration}`
- **Launcher Detection**: Caches home screen packages to reset blocking state

**3. `BlockingOverlayService` (Foreground Service)**
- **Overlay Type**: `TYPE_APPLICATION_OVERLAY` (Android O+) 
- **Layout**: `R.layout.overlay_blocked` (Native Android XML, not in repo)
- **Buttons**:
  - "Go Back" → sends `GLOBAL_ACTION_BACK` + home intent
  - "Open Omit" → kills app then launches MainActivity
- **Notification**: Low-priority foreground notification (required by Android)

### Data Flow

```typescript
// Web → Native Bridge Example
import { AppBlocker } from '@capacitor/app-blocker';

// Set blocklist
await AppBlocker.setBlockedApps({ apps: ['com.instagram.android', 'com.zhiliaoapp.musically'] });

// Start monitoring (triggers AccessibilityService)
await AppBlocker.startMonitoring();

// Listen for usage events (broadcast from native)
AppBlocker.addListener('usageUpdate', (info) => {
  console.log(`Used ${info.packageName} for ${info.duration}ms`);
  sendToSupabase('usage', info); // Optional cloud sync
});
```

### API & Integration Points

| Endpoint | Direction | Payload | Description |
|----------|-----------|---------|-------------|
| `setBlockedApps` | Web → Native | `{ apps: string[] }` | Update blocklist |
| `startMonitoring` | Web → Native | `{}` | Enable AccessibilityService |
| `usageUpdate` | Native → Web | `{ packageName, duration }` | Broadcast usage duration |
| `checkPermissions` | Web → Native | `{}` | Returns permission status |
| `getInstalledApps` | Web → Native | `{}` | Returns full app list with Base64 icons |

---

## 🚀 Installation & Usage Guide

### Prerequisites
- **Node.js** 18+ (LTS) with npm or yarn
- **Android Studio** (for Android builds)
- **Java JDK** 17+
- **Capacitor CLI** 8.0.1 (`npm i -g @capacitor/cli`)

### Step 1: Clone & Install

```bash
# Clone the repository
git clone https://github.com/your-org/omit-mobileapp.git
cd omit-mobileapp

# Install dependencies
npm ci --prefer-offline --no-audit

# Initialize Capacitor (if not already)
npx cap init Omit com.omit.app --web-dir=dist
```

### Step 2: Configure Environment

Create `.env.local` for development:

```env
# Supabase (optional cloud sync)
VITE_SUPABASE_URL=your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Analytics (optional)
VITE_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX

# Feature flags
VITE_ENABLE_STRICT_MODE=true
VITE_STRICT_MODE_COOLDOWN_MS=2000
```

### Step 3: Development

```bash
# Start Vite dev server (hot reload)
npm run dev

# In another terminal, sync to Android
npx cap sync android
npx cap open android  # Opens Android Studio

# Run on device/emulator (in Android Studio)
#   Build → Run 'app'
```

### Step 4: Build for Production

```bash
# Build web assets
npm run build

# Copy assets to native projects
npx cap sync

# Generate release APK (in Android Studio)
#   Build → Generate Signed Bundle / APK
```

### Step 5: Deploy Web Version

```bash
# Deploy to Vercel (recommended)
npm i -g vercel
vercel --prod

# Or Netlify
npm install -g netlify-cli
netlify deploy --dir=dist --prod

# Or any static host
npm run build
# Upload `dist/` folder to your host
```

---

## 📚 Usage Examples

### Example 1: Starting a Focus Session

```typescript
import { useFocusSession } from '@/hooks/useFocusSession';

function Dashboard() {
  const { startSession, isActive } = useFocusSession();

  const handleStart = async () => {
    await startSession({
      type: 'deep_work',
      taskId: 'task-123',
      duration: 25 * 60, // 25 minutes
      strictMode: true,  // Cannot cancel
      blockApps: ['instagram', 'tiktok', 'youtube']
    });
  };

  return (
    <button onClick={handleStart} disabled={isActive}>
      {isActive ? 'Session Running' : 'Start Focus'}
    </button>
  );
}
```

### Example 2: Listening to App Block Events

```typescript
// In your main app component
useEffect(() => {
  const unsubscribe = AppBlocker.addListener('overlayDismissed', () => {
    // Track dismissal for analytics
    analytics.track('overlay_dismissed', { timestamp: Date.now() });
  });

  return () => unsubscribe();
}, []);
```

### Example 3: Custom Blocklist Management

```typescript
// Fetch user's saved blocklist from Supabase
const { data: blocklist } = await supabase
  .from('user_blocklists')
  .select('*')
  .eq('user_id', user.id);

// Update native layer
await AppBlocker.setBlockedApps({
  apps: blocklist.map(b => b.package_name)
});
```

### Example 4: Creating a Task via Quick Add

```typescript
// Simulate keyboard shortcut (⌘+Enter) from the modal
const handleSave = async (taskText: string) => {
  const task = {
    id: crypto.randomUUID(),
    title: taskText,
    priority: 'high' as const,
    dueDate: today(),
    createdAt: new Date().toISOString()
  };

  // Optimistic UI update
  setTasks(prev => [task, ...prev]);
  
  // Persist
  await supabase.from('tasks').insert(task);
};
```

---

## 🔮 Future Potential & Roadmap

### Q4 2024 (Current)
- ✅ Android app blocking (AccessibilityService)
- ✅ Focus timer with task coupling
- ✅ Basic analytics dashboard
- ✅ Web dashboard deployment

### Q1 2025 (Near-term)
- 🎯 **iOS support** using Screen Time API + Guided Access
- 🎯 **Chrome Extension** for website blocking (Manifest V3)
- 🎯 **Calendar sync** (Google Calendar, Outlook)
- 🎯 **Team accounts** with shared blocklists
- 🎯 **Widgets** (iOS/Android home screen focus starters)

### Q2 2025 (Mid-term)
- 🚀 **AI Focus Coach** — predictive scheduling based on past performance
- 🚀 **Gamification** — focus streaks, NFTs for achievements, leaderboards
- 🚀 **Wear OS companion** — start timer from smartwatch
- 🚀 **Desktopp app** (Electron) for website blocking

### Q3-Q4 2025 (Long-term)
- 🌍 **Enterprise API** — integrate with Slack, Asana, Jira
- 🌍 **Neural feedback** — optional EEG headset integration (Muse, OpenBCI)
- 🌍 **ARKit/CoreMotion** — detect physical motion to pause timer when walking
- 🌍 **Open-source plugin ecosystem** — community-built integrations

### Monetization Strategy (B2C & B2B)
| Tier | Price | Features |
|------|-------|----------|
| **Free** | $0 | 1 device, 3 blocklists, basic insights |
| **Pro** | $4.99/mo | Unlimited devices, AI coach, calendar sync |
| **Team** | $8/user/mo | Admin dashboard, shared policies, SSO |
| **Enterprise** | Custom | On-premise deployment, SOC2, SLA |

---

## 🤝 Contributing

We welcome contributions from developers, designers, and focus enthusiasts!

### Getting Started

1. **Fork the repository**
2. **Clone your fork** and create a feature branch:
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Install dependencies** (see above)
4. **Make your changes** — follow our design system in `src/index.css`
5. **Test on Android** (required for native changes):
   ```bash
   npm run build
   npx cap sync android
   npx cap open android
   ```
6. **Lint and format**:
   ```bash
   npm run lint
   npx prettier --write .
   ```
7. **Submit a Pull Request** with clear description and screenshots.

### Architecture Guidelines

- **Frontend**: Use `src/components/ui` for new shadcn-compatible components
- **Native**: Add Capacitor plugin methods in `AppBlockerPlugin.java`; keep services stateless where possible
- **State**: Prefer React Context over Redux for simplicity; use Supabase for persistence
- **Design**: Follow the "Zen Luxury" palette (`--primary: 258 90% 60%` for light, `258 85% 65%` for dark)
- **Accessibility**: All interactive elements must have `aria-label` and proper focus states

### Code of Conduct

We are committed to a harassment-free, inclusive environment. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for details.

```
MIT License

Copyright (c) 2024 Omit Project

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🙏 Acknowledgments

- **Lovable.dev** — AI-powered development platform that accelerated initial prototyping
- **Radix UI** — unparalleled accessible primitives
- **Tailwind CSS** — the utility-first revolution
- **Material Symbols** — beautiful, variable-weight icon font
- **Inter & Outfit** — typefaces that make our UI sing

---

<div align="center">

**Made with ☕ and 🧠 by the Omit Team**

[Twitter](https://twitter.com/omitapp) • [Discord](https://discord.gg/omit) • [Blog](https://blog.omit.app)

*Focus isn't about depriving yourself. It's about creating space for what truly matters.*

</div>