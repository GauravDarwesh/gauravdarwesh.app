
<!-- ========================================================= -->
<!--                     gauravdarwesh.app                     -->
<!-- ========================================================= -->

<div align="center">

  <h1>gauravdarwesh.app</h1>

  <p>
    <strong>A personal digital home for work, ideas, experiments, and the things I am curious about.</strong>
  </p>

  <p>
    <a href="https://gauravdarwesh.app">🌐 Visit the live website</a>
    &nbsp;•&nbsp;
    <a href="https://github.com/GauravDarwesh">GitHub</a>
    &nbsp;•&nbsp;
    <a href="https://linkedin.com/in/gauravdarwesh">LinkedIn</a>
    &nbsp;•&nbsp;
    <a href="https://strava.app.link/hNhQ2KtF94b">Strava</a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React 18" />
    <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" />
    <img src="https://img.shields.io/badge/Tailwind%20CSS-3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/Supabase-Edge%20Functions-3ECF8E?style=flat-square&logo=supabase&logoColor=white" alt="Supabase Edge Functions" />
  </p>

</div>

---

## ✦ What this is

This repository is the source code for **[gauravdarwesh.app](https://gauravdarwesh.app)** — a portfolio site designed less like a traditional resume and more like an interactive personal workspace.

| Area | What it does |
| --- | --- |
| **GDx** | An AI-style search interface for exploring the site and connected knowledge |
| **Experience** | Resume-style experience, skills, platforms, certifications, and extracurriculars |
| **Activity** | GitHub contribution activity and training information |
| **Writing** | A curated writing archive connected to Notion |
| **Visuals** | Photography and visual collections |
| **Themes** | Multiple site moods with persistent visual treatment and ambient audio |

The frontend is component-driven and keeps external services configurable through environment variables rather than committing credentials.

---

## ◉ Live experience

### [Open gauravdarwesh.app ↗](https://gauravdarwesh.app)

GitHub does not provide a safe way to run an arbitrary live webpage, iframe, or JavaScript application directly inside a repository README. Instead, this README uses GitHub-native interactivity: clickable navigation, collapsible sections, live links, and Mermaid-rendered diagrams.

The result is a README that behaves more like a guided product page while the real application stays one click away.

---

## ⌘ How the site fits together

```mermaid
flowchart LR
    V[Visitor] --> UI[React + TypeScript UI]

    UI --> HOME[Home]
    UI --> EXP[Experience]
    UI --> BLOG[Writing]
    UI --> VIS[Visuals]

    HOME --> GDx[GDx Search]
    EXP --> ACT[GitHub Activity]
    EXP --> TRAIN[Training Data]

    GDx --> EDGE[Supabase Edge Functions]
    TRAIN --> EDGE
    VIS --> STORAGE[Supabase Storage]
    BLOG --> NOTION[Notion]

    classDef primary fill:#111827,stroke:#fb923c,color:#fff,stroke-width:2px;
    classDef secondary fill:#1f2937,stroke:#94a3b8,color:#fff;
    class V,UI,GDx primary;
    class HOME,EXP,BLOG,VIS,EDGE,STORAGE,NOTION,ACT,TRAIN secondary;
```

### Page map

```mermaid
graph TD
    A["gauravdarwesh.app"] --> B["Home"]
    A --> C["Experience & Skills"]
    A --> D["Writing"]
    A --> E["Visuals"]

    B --> B1["GDx / Search"]
    C --> C1["Experience"]
    C --> C2["Skills"]
    C --> C3["GitHub Activity"]
    C --> C4["Training"]
    D --> D1["Notion Articles"]
    E --> E1["Photo Collections"]

    click B "https://gauravdarwesh.app/"
    click C "https://gauravdarwesh.app/hobbies"
    click D "https://gauravdarwesh.app/blog"
    click E "https://gauravdarwesh.app/visuals"
```

---

## ◈ The stack

**Frontend**

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Framer Motion
- React Router

**Data & integrations**

- Supabase Edge Functions
- Supabase Storage
- GitHub activity data
- Notion content

**UI / interaction**

- Responsive navigation
- Animated backgrounds
- Theme switching
- Ambient audio
- Interactive search
- Responsive activity and media views

---

## ◎ GitHub activity

<p align="center">
  <a href="https://github.com/GauravDarwesh">
    <img
      src="https://github.com/users/GauravDarwesh/contributions"
      alt="Gaurav Darwesh GitHub contribution calendar"
      width="95%"
    />
  </a>
</p>

<p align="center">
  <img
    src="https://github-readme-stats.vercel.app/api?username=GauravDarwesh&show_icons=true&hide_border=true&theme=transparent&rank_icon=github"
    alt="Gaurav Darwesh GitHub statistics"
  />
</p>

<p align="center">
  <sub>
    Contribution activity is served directly from GitHub above; the statistics card is an additional visual summary.
  </sub>
</p>

---

## ⤷ Run locally

### 1. Clone

```bash
git clone https://github.com/GauravDarwesh/gauravdarwesh.app.git
cd gauravdarwesh.app
```

### 2. Install

```bash
npm install
```

### 3. Configure environment variables

Create a local .env file for your own backend configuration.

Example:

```env
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_public_key
```

Never commit .env files, tokens, service-role keys, or other private credentials.

### 4. Start

```bash
npm run dev
```

### 5. Build

```bash
npm run build
```

---

## ▸ Repository structure

```text
.
├── public/
│   ├── favicon.ico
│   ├── music/
│   ├── robots.txt
│   └── sitemap.xml
│
├── src/
│   ├── components/
│   │   ├── SearchBar.tsx
│   │   ├── NavigationToggle.tsx
│   │   ├── AmbientSoundControl.tsx
│   │   └── ui/
│   │
│   ├── pages/
│   │   ├── Index.tsx
│   │   ├── Hobbies.tsx
│   │   ├── Blog.tsx
│   │   └── Visuals.tsx
│   │
│   └── lib/
│       ├── api.ts
│       ├── linkParser.ts
│       └── session.ts
│
├── index.html
├── package.json
├── tailwind.config.ts
└── vite.config.ts
```

---

## ✦ Design principles

> **Build the interface around the experience, not around the framework.**

The site keeps its visual identity opinionated, lets motion support navigation instead of overpowering it, and keeps environment-specific configuration outside the source tree.

---

<details>
<summary><strong>Explore the repository</strong></summary>

### Main routes

- / — home / GDx search experience
- /hobbies — experience, skills, activity, training
- /blog — writing archive
- /visuals — visual collections

### Useful entry points

- src/App.tsx — application shell and routing
- src/components/SearchBar.tsx — GDx interaction
- src/pages/Hobbies.tsx — experience and activity
- src/pages/Blog.tsx — writing archive
- src/pages/Visuals.tsx — visual collections
- src/lib/api.ts — backend communication

</details>

<details>
<summary><strong>Public / private boundary</strong></summary>

This repository intentionally contains the frontend and public-facing configuration only.

Backend implementation, database migrations, and deployment secrets are maintained outside this public source tree. Runtime configuration is supplied through environment variables.

</details>

---

## ◌ Links

<p align="center">
  <a href="https://gauravdarwesh.app">Website</a>
  &nbsp; · &nbsp;
  <a href="https://github.com/GauravDarwesh">GitHub</a>
  &nbsp; · &nbsp;
  <a href="https://linkedin.com/in/gauravdarwesh">LinkedIn</a>
  &nbsp; · &nbsp;
  <a href="https://instagram.com/allaboutgaurav">Instagram</a>
  &nbsp; · &nbsp;
  <a href="https://strava.app.link/hNhQ2KtF94b">Strava</a>
</p>

---

<div align="center">

  <sub>© 2026 Gaurav Darwesh. All rights reserved.</sub>

  <br />

  <sub>
    Source code is public for reference and portfolio purposes. Unless otherwise stated,
    the original code, content, design, media, and assets in this repository may not be
    reproduced, redistributed, or reused commercially without permission.
  </sub>

</div>
