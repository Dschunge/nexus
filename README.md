# Nexus

Advanced note-taking app for developers and power users. Built with a keyboard-first, distraction-free philosophy and AI features that feel native.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss)
![Prisma](https://img.shields.io/badge/Prisma-v5-2D3748?logo=prisma)

## Features

- **Rich editor** — Tiptap-powered with slash commands (`/`), toolbar, task lists, tables, code blocks with syntax highlighting
- **AI inline commands** — `Ctrl+J` to continue writing, rewrite, summarize, explain, fix code, or run a custom prompt via Claude
- **Command palette** — `Ctrl+K` for instant full-text note search and quick actions
- **Autosave** — every keystroke debounced and saved within 1 second
- **Folders & tags** — nested folder tree, tag management
- **Dark mode by default** — respects system preference, toggleable

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Editor | Tiptap (ProseMirror) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| API | tRPC v11 + TanStack Query |
| Database | PostgreSQL via Prisma v5 |
| Auth | Better-Auth (email/password) |
| AI | Anthropic Claude API (`claude-sonnet-4-6`) |
| Package manager | pnpm |

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm (`npm install -g pnpm`)
- PostgreSQL database

### 1. Clone and install

```bash
git clone https://github.com/Dschunge/nexus.git
cd nexus
pnpm install
```

### 2. Configure environment

Create a `.env.local` file in the project root:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/nexus
BETTER_AUTH_SECRET=your-32-char-secret
BETTER_AUTH_URL=http://localhost:3000
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Get an Anthropic API key at [platform.claude.com](https://platform.claude.com).

### 3. Set up the database

```bash
pnpm prisma db push
```

### 4. Run the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), sign up, and start writing.

## Keyboard Shortcuts

| Action | Shortcut |
|---|---|
| New note | `Ctrl+N` |
| Search / Command palette | `Ctrl+K` |
| AI commands | `Ctrl+J` |
| Toggle sidebar | `Ctrl+\` |
| Slash command menu | `/` in editor |
| Bold | `Ctrl+B` |
| Italic | `Ctrl+I` |

## Project Structure

```
nexus/
├── app/
│   ├── (auth)/login & signup    # Auth pages
│   ├── (app)/notes/[id]         # Note editor view
│   └── api/auth & trpc          # API routes
├── components/
│   ├── editor/                  # Tiptap editor, toolbar, AI menu, slash commands
│   ├── sidebar/                 # Sidebar, folder tree
│   └── search/                  # Command palette
├── lib/
│   ├── auth.ts                  # Better-Auth config
│   ├── db.ts                    # Prisma client
│   ├── anthropic.ts             # Claude client
│   └── trpc/                    # tRPC routers (notes, folders, tags, ai)
└── prisma/schema.prisma         # Database schema
```

## License

MIT
