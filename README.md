# GreenOrange Services - Portfolio & CMS

This is a full-stack monorepo for **GreenOrange Services** (Vệ Sinh & Thi Công Cửa Hàng). It contains both the public-facing landing page and the internal Content Management System.

## 🏗️ Project Structure

This project uses **Turborepo** to manage multiple applications in a single repository:

- `apps/web`: The Next.js 16 frontend landing page and portfolio. Built with React Server Components, Tailwind CSS, and standard UI components.
- `apps/cms`: The Payload CMS backend, providing a headless content management interface to manage services, projects, and testimonials.

## 🚀 Getting Started

### Prerequisites

This project uses [Bun](https://bun.sh/) as its package manager and script runner.

### Installation

1. Clone the repository and install dependencies using Bun:

   ```bash
   bun install
   ```

2. (Optional) Set up any required environment variables. You may need to configure `.env.local` or `.env` inside `apps/cms` or `apps/web` for database connections and secret keys.

### Running Development Servers

To start both the Web frontend and the CMS backend concurrently, run:

```bash
bun run dev
```

This uses Turborepo to start the development servers:

- **Web App**: <http://localhost:3000>
- **CMS Admin**: <http://localhost:3001>

## 🛠️ Available Commands

From the root directory, you can run the following commands:

- `bun run dev`: Start all development servers.
- `bun run build`: Build all applications for production.
- `bun run lint`: Run ESLint across all workspaces.
- `bun run format`: Format all codebase files (`.js, .ts, .tsx, .md`) using Prettier.
- `bun run clean`: Clean up build artifacts (`.next`, `dist`, etc.) across all apps.

## 🎨 Tech Stack

- **Framework**: Next.js 16 (App Router)
- **CMS**: Payload CMS
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Monorepo**: Turborepo
- **Package Manager**: Bun
- **Linting & Formatting**: ESLint 9 (Flat Config) & Prettier
