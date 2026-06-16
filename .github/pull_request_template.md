# PR Checklist

## Description

<!-- Describe your changes in detail here -->

## Related Issues

<!-- Link to the issue(s) this PR solves (e.g., "Fixes #123") -->

## Code Style Reflection Checklist

Please take a moment to verify that your code adheres to our project style guidelines before requesting a review. This helps us maintain consistency and performance across the codebase.

### Frontend (React/Next.js) ⚛️

- [ ] **Typing & Safety**: Removed all `any` types and consistently used optional chaining (`?.`).
- [ ] **Enums & Constants**: Used `enum` for literal-string unions. Extracted magic strings/numbers to constants.
- [ ] **Performance**: Used `batchProcess` instead of sequential `await` loops. Virtualized large lists.
- [ ] **Component Structure**: Followed feature-based folder structures (no `index.tsx` barrels, named utility folders).
- [ ] **State & Handlers**: Used Context providers proactively to avoid prop drilling. Avoided inline arrow functions in JSX event props.
- [ ] **UI Polish**: Used `ScrollArea` for scrollable containers. Rendered appropriate loading states (Skeletons for cold load, dim+spinner for refetches).
- [ ] **Data Handling**: Used Day.js (stored as UTC, displayed local). Formatted currency fixed to 2 decimal places.

### Backend (FastAPI/Python) 🐍

- [ ] **Typing & Formatting**: Removed bare `Any` types. Formatted and linted code via `ruff` (`ruff check --fix` & `ruff format`).
- [ ] **Enums & Constants**: Defined `StrEnum` in `constants.py` for finite string sets.
- [ ] **Concurrency**: Overlapped I/O with `asyncio.gather` instead of sequential awaits. Ensured no blocking code in the event loop.
- [ ] **Architecture**: Strictly followed Feature-Based folder structure (no global `models/` dumping grounds). Logic belongs in `service.py`, routers remain thin.
- [ ] **Dependency Injection**: Used FastAPI `Depends` for shared resources (session, user, settings) to avoid parameter drilling.
- [ ] **Database & Schemas**: Used separate Pydantic schemas for requests/responses. Paginating unbounded collections. Grouped related writes in transactions.
- [ ] **Data Handling**: Stored timestamps in UTC with timezone-aware datetimes. Used `decimal.Decimal` (never `float`) for money.

### General QA 🧪

- [ ] Did you run tests locally?
- [ ] Are there any console errors or warnings?
- [ ] Have you tested this manually in the browser / via API clients?
