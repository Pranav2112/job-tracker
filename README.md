# AppTracker

A full-featured internship and job application tracker built with React, Vite, TypeScript, and Supabase. Designed to make the job search process organized, visual, and actually enjoyable.

![Status](https://img.shields.io/badge/Status-Active-brightgreen) ![React](https://img.shields.io/badge/React-18-61DAFB?logo=react) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript) ![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase)

---

## Features

### Core Tracking
- **Kanban board** — drag applications across pipeline stages with smooth animations
- **Applications table** — sortable, filterable list view with bulk actions (move stage, export CSV, delete)
- **Application detail page** — inline editing for every field, completeness score, next action prompt
- **Calendar view** — deadline and interview schedule at a glance
- **Contacts** — link recruiters and hiring managers to applications

### Smart UX
- **Cmd+K command palette** — jump anywhere or add a new application in seconds
- **Global sidebar search** — fuzzy search across all tracked companies and roles
- **Completeness ring** — per-card SVG ring showing how filled-out each application is
- **Interview countdown** — badge on Kanban cards showing days until the next scheduled round
- **Keyboard shortcuts** — `N` new app · `K` dashboard · `L` list · `C` calendar · `U` contacts · `?` help overlay
- **PDF preview** — inline document viewer with fullscreen overlay, back button, and download option
- **Dark / light mode** — system-aware with persistent localStorage preference

### Gamification
- **XP system** — earn points for every action: adding apps, uploading docs, logging interviews, writing notes
- **7 level progression** — Newcomer → Prospect → Candidate → Contender → Finalist → Offer Magnet → Hired
- **Daily streak tracker** — flame counter in the sidebar, resets if you miss a day
- **14 Achievement badges** — common / rare / epic / legendary rarity tiers, unlocked in real time
- **Season Goal** — set a target application count and watch the animated progress bar fill up
- **Weekly Challenges** — 3 rotating challenges with XP rewards
- **Confetti celebrations** — burst animation when you drag a card to Offer or Accepted

### Design
- Inter font, indigo-primary design system
- GSAP animations throughout — stagger lists, counter increments, hover lifts, slide-ins
- Glassmorphism sidebar, gradient stat cards, glow effects on active elements
- Responsive — full sidebar on desktop, bottom tab bar on mobile

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + Vite |
| Language | TypeScript |
| Styling | Tailwind CSS v3 + shadcn/ui |
| Backend | Supabase (PostgreSQL + RLS + Auth + Storage) |
| Data fetching | TanStack Query v5 |
| Drag & drop | @dnd-kit/core + @dnd-kit/sortable |
| Table | TanStack Table v8 |
| Animations | GSAP |
| Confetti | canvas-confetti |
| Icons | Lucide React |
| Routing | React Router v6 |

---

## Getting Started

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project

### 1. Clone and install

```bash
git clone https://github.com/Pranav2112/job-tracker.git
cd job-tracker
npm install
```

### 2. Set up environment variables

Create a `.env.local` file in the root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Run the database migrations

In your Supabase SQL editor, run the files in `supabase/migrations/` in order:

```
001_initial_schema.sql
002_gamification.sql
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Project Structure

```
src/
├── components/
│   ├── common/          # CommandPalette, FilePreviewModal, StageBadge, ShortcutsOverlay
│   ├── forms/           # ApplicationForm
│   ├── gamification/    # AchievementsModal, SeasonGoal, WeeklyChallenges
│   ├── kanban/          # KanbanBoard, KanbanColumn, KanbanCard
│   ├── layout/          # Sidebar, BottomNav, AppLayout
│   └── ui/              # shadcn/ui primitives
├── contexts/            # AuthContext, ThemeContext
├── hooks/               # useApplications, useDetailData, useGamification
├── lib/                 # supabase client, animations, completeness, utils
├── pages/               # DashboardPage, ApplicationsPage, ApplicationDetailPage, ...
└── types/               # TypeScript interfaces
supabase/
└── migrations/          # SQL schema files
```

---

## License

MIT
