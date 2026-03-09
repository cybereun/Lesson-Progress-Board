# Lesson Progress Board

Single-subject lesson progress web app for teachers.

This app is built for one teacher using one PC locally. It separates content management from the lesson execution board so the teacher can register lesson items in advance and check progress by class after each period.

## Features

- `/admin`: register, edit, reorder, disable, and delete lesson item rows
- `/board`: create a lesson row by date, period, and lesson item, then check `EMPTY -> O -> X -> EMPTY` for classes `1` to `9`
- `/progress`: view the latest recorded progress for each class
- SQLite-based local persistence
- PWA-ready manifest and install icons

## Tech Stack

- Next.js
- TypeScript
- SQLite
- Local helper script for Google Drive based workspace syncing

## Project Structure

```text
src/app/admin       Management screen
src/app/board       Lesson execution screen
src/app/progress    Latest progress screen
src/app/api         App routes for lesson items, rows, checks, and progress
src/components      UI panels and shared shell
src/lib             Database and shared constants/types
scripts/local.ps1   Sync/run helper for local NTFS execution
```

## Run Locally

This project is edited in a Google Drive path, so direct dependency installs on `Y:` may be unstable.

Use the local helper script instead:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\local.ps1 -Command dev
```

Default port is `3000`.

To run on another port:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\local.ps1 -Command dev -Port 3100
```

## Common Commands

```powershell
# Sync source into the local NTFS runtime folder
powershell -ExecutionPolicy Bypass -File .\scripts\local.ps1 -Command sync

# Run development server
powershell -ExecutionPolicy Bypass -File .\scripts\local.ps1 -Command dev

# Type check
powershell -ExecutionPolicy Bypass -File .\scripts\local.ps1 -Command typecheck

# Lint
powershell -ExecutionPolicy Bypass -File .\scripts\local.ps1 -Command lint

# Production build
powershell -ExecutionPolicy Bypass -File .\scripts\local.ps1 -Command build

# Start production server
powershell -ExecutionPolicy Bypass -File .\scripts\local.ps1 -Command start
```

## Local Runtime Paths

- Runtime copy: `C:\CodexTemp\lesson-progress-board-run`
- Dependencies: `C:\CodexTemp\lesson-progress-board-deps`
- Data: `C:\CodexTemp\lesson-progress-board-data`
- Logs: `C:\CodexTemp\lesson-progress-board-logs`

The data folder is separate from the source folder, so lesson records remain after syncing code again.

## Current Scope

- Single subject only
- Fixed classes: `1` to `9`
- Fixed periods: `1` to `7`
- No login
- No export or print support yet
