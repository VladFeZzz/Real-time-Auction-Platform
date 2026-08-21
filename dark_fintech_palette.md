# Dark Fintech & Neon Accent — Color Palette & UI Guide

> Design system specification and Tailwind CSS classes for the **Real-time Auction & Flash Sale Platform**.

---

## 1. Core Color Palette Specification

| Token / Role | Semantic Purpose | Tailwind Class | Hex Code | Preview / Usage Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Background (Main)** | Canvas background for all pages | `bg-slate-950` | `#020617` | Deepest dark shade, maximizes contrast |
| **Surface / Card** | Auction cards, modals, dropdowns | `bg-slate-900` | `#0f172a` | Elevated surface layer |
| **Surface Subdued** | Table headers, disabled areas, inputs | `bg-slate-800/60` | `#1e293b` | Secondary surface layer |
| **Border / Divider** | Subtle card borders, dividers, outlines | `border-slate-800` | `#1e293b` | Clean structure without harsh lines |
| **Primary Action** | Main CTA buttons (Place Bid, Deposit) | `bg-indigo-600` | `#4f46e5` | Vibrant focus color for high conversion |
| **Primary Hover** | Interactive button hover states | `hover:bg-indigo-500` | `#6366f1` | Immediate visual feedback |
| **Accent / Urgency** | Countdown timers, `LIVE` badges | `text-amber-400` / `bg-amber-500` | `#f59e0b` | High-attention FOMO trigger |
| **Success / Outbid** | Winning bids, deposit completed, green pulse | `text-emerald-400` / `bg-emerald-500` | `#10b981` | Real-time positive state feedback |
| **Destructive / Error** | Outbid alerts, failed transactions, cancel | `text-rose-400` / `bg-rose-500` | `#f43f5e` | Immediate error/warning indicator |
| **Text Primary** | Main titles, prices, critical numbers | `text-slate-50` | `#f8fafc` | Maximum readability (100% white-ish) |
| **Text Secondary** | Subheadings, descriptions | `text-slate-300` | `#cbd5e1` | Secondary hierarchy |
| **Text Muted** | Bid timestamps, labels, helper text | `text-slate-400` | `#94a3b8` | Subtle metadata |

---

## 2. Component Usage & Tailwind Mapping

### A. Auction Item Card
* **Container:** `bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg shadow-black/40 hover:border-slate-700 transition-all`
* **Title:** `text-lg font-semibold text-slate-50 line-clamp-1`
* **Current Price Display:** `text-2xl font-black text-indigo-400 tracking-tight`
* **Timer (Urgent):** `text-sm font-medium text-amber-400 flex items-center gap-1.5`

### B. Live Status Indicator (`LIVE`)
* **Badge Container:** `inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold uppercase tracking-wider`
* **Pulsing Dot:** `<span class="relative flex h-2 w-2"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span></span>`

### C. Quick-Bid Action Buttons
* **Preset Buttons (+10₴, +50₴):** `bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium py-2 px-4 rounded-lg border border-slate-700 transition-colors`
* **Main "Place Bid" CTA:** `w-full bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-indigo-600/25 transition-all`

### D. Real-Time Bid History Log (WebSockets)
* **Table/List Container:** `divide-y divide-slate-800/80 bg-slate-900/50 rounded-lg border border-slate-800`
* **Standard Bid Row:** `flex items-center justify-between p-3 text-sm text-slate-300`
* **New Bid Incoming Flash (Apply for 400ms on socket event):**
  * Class: `bg-emerald-500/20 text-emerald-300 transition-colors duration-500`

---

## 3. Tailwind Configuration Snippet (`tailwind.config.js`)

If you want custom semantic names in your config:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#020617', // slate-950
        surface: {
          DEFAULT: '#0f172a',  // slate-900
          subdued: '#1e293b',  // slate-800
        },
        primary: {
          DEFAULT: '#4f46e5',  // indigo-600
          hover: '#6366f1',    // indigo-500
          light: '#818cf8',    // indigo-400
        },
        accent: {
          amber: '#f59e0b',    // amber-500
          emerald: '#10b981',  // emerald-500
          rose: '#f43f5e',     // rose-500
        },
      },
    },
  },
  plugins: [],
}
```
