# AJ Bokföring - Claude Code Rules

## Permissions - IMPORTANT
**ALWAYS run commands directly without asking for permission:**
- Git commands (fetch, pull, push, commit, etc.)
- npm/build commands
- TypeScript compilation
- Test commands

## Auto-Run Commands (No Approval Needed)
**IMPORTANT:** Always assume the user clicks "Yes" (option 1) for ALL bash commands.
Never ask for permission - just run the command directly.

Run ALL commands without asking for approval, including but not limited to:
- `git` - All git commands (fetch, status, pull, push, commit, etc.)
- `npm` - Package management and scripts
- `npx` - TypeScript and other tools
- `lsof` - Check ports and processes
- `kill` - Terminate processes
- Any other bash commands needed for development

## Session Start - CRITICAL CHECKS
**FIRST thing to do in a new session (in this order):**

### 1. Sync with GitHub
```bash
git fetch origin
git status
```
- If there are new commits on remote, inform the user and ask if they want to run `git pull`

### 2. Check Build Status
```bash
npm run build
```
- Verify TypeScript compiles without errors for both frontend and Electron

## Project Structure
```
AJ/
├── electron/           # Electron main process
│   ├── main.ts        # Main entry point, IPC handlers
│   ├── preload.ts     # Bridge between main and renderer
│   ├── database.ts    # SQLite database setup and queries
│   ├── fiscalYears.ts # Fiscal year CRUD
│   ├── customers.ts   # Customer registry CRUD
│   ├── suppliers.ts   # Supplier registry CRUD
│   └── invoices.ts    # PDF parsing and invoice import
├── src/               # React frontend
│   ├── components/    # Reusable components
│   ├── pages/         # Page components
│   ├── types/         # TypeScript interfaces
│   └── vite-env.d.ts  # Window API type declarations
├── dist/              # Built frontend (Vite output)
└── dist-electron/     # Built Electron (TypeScript output)
```

## Technology Stack
- **Frontend:** React 18 + TypeScript + Vite + TailwindCSS
- **Desktop:** Electron 34
- **Database:** SQLite via better-sqlite3 (embedded, no server needed)
- **PDF Parsing:** pdf-parse v2

## Development Commands

### Start Development
```bash
# Start both Vite and Electron in development mode
npm run electron:dev
```

### Build for Production
```bash
# Build frontend and Electron TypeScript
npm run build

# Build and package distributable app
npm run dist
```

### Individual Commands
```bash
npm run dev       # Vite dev server only (frontend)
npm run electron  # Start Electron only (requires built frontend)
```

## Database
The app uses SQLite stored at the user's app data path:
- **macOS:** `~/Library/Application Support/aj-bokforing/bokforing.db`

Database is initialized automatically on first run with:
- Swedish chart of accounts (kontoplan)
- Fiscal year 2025 as active year

### Key Tables
- `accounts` - Chart of accounts
- `transactions` / `transaction_lines` - Bookkeeping entries
- `fiscal_years` - Year management
- `customers` - Customer registry
- `suppliers` - Supplier registry
- `customer_invoices` - Outgoing invoices (PDF imports)
- `supplier_invoices` - Incoming invoices (PDF imports)
- `invoice_folders` - Watched folders for PDF scanning

## Invoice Import Logic
PDF files are categorized automatically by filename:
- **Customer invoice:** Filename starts with `YYYY-MM-DD Faktura`
  - Example: `2025-01-15 Faktura AB Company.pdf`
- **Supplier invoice:** All other PDF files

## Deploy Command
When the user writes "deploy", push all changes to GitHub:
```bash
git add .
git commit -m "Descriptive message"
git push origin main
```

## IPC Communication Pattern
All database operations go through Electron IPC:
1. Frontend calls `window.api.methodName()`
2. Preload exposes methods via `contextBridge`
3. Main process handles via `ipcMain.handle('db:methodName', ...)`

When adding new features:
1. Add database function in `electron/` module
2. Add IPC handler in `electron/main.ts`
3. Expose API in `electron/preload.ts`
4. Add TypeScript types in `src/vite-env.d.ts`
5. Add shared types in `src/types/index.ts`

## Code Style
- Swedish for user-facing text and comments
- English for code (variable names, function names)
- TailwindCSS for styling
- Functional React components with hooks
