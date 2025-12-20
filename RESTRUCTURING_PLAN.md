# HR_BOT Repository Restructuring Plan

## Overview
This document outlines the complete restructuring of the HR_BOT repository to implement a scalable, maintainable folder structure suitable for a full-stack application.

## Current Structure Analysis
```
HR_BOT/
├── src/                    # Main backend source
├── api/                    # API route handlers (chats, leave, etc.)
├── backend/                # Backend configuration
├── hr-agent-bot/          # Frontend application
├── tests/                  # Test files
├── data/                   # Data files
├── coverage/               # Test coverage reports
├── HRBotDoc/               # Documentation
└── public/                 # Static assets
```

## Proposed New Structure

```
HR_BOT/
├── apps/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── config/           # Configuration files
│   │   │   │   ├── database.ts
│   │   │   │   ├── env.ts
│   │   │   │   └── salesforce.ts
│   │   │   ├── controllers/      # API controllers
│   │   │   │   ├── chatController.ts
│   │   │   │   ├── leaveController.ts
│   │   │   │   └── workFromHomeController.ts
│   │   │   ├── routes/           # API routes
│   │   │   │   ├── api/
│   │   │   │   │   ├── chat.routes.ts
│   │   │   │   │   ├── leave.routes.ts
│   │   │   │   │   └── workFromHome.routes.ts
│   │   │   │   └── index.ts
│   │   │   ├── middleware/       # Express middleware
│   │   │   │   ├── auth.middleware.ts
│   │   │   │   ├── errorHandler.middleware.ts
│   │   │   │   └── logger.middleware.ts
│   │   │   ├── models/           # Database models
│   │   │   │   ├── User.model.ts
│   │   │   │   ├── Leave.model.ts
│   │   │   │   └── Chat.model.ts
│   │   │   ├── services/         # Business logic
│   │   │   │   ├── chatService.ts
│   │   │   │   ├── leaveService.ts
│   │   │   │   ├── aiService.ts
│   │   │   │   └── salesforceService.ts
│   │   │   ├── types/            # TypeScript type definitions
│   │   │   │   ├── index.ts
│   │   │   │   ├── api.types.ts
│   │   │   │   ├── entities.types.ts
│   │   │   │   └── request.types.ts
│   │   │   ├── utils/            # Utility functions
│   │   │   │   ├── validators.ts
│   │   │   │   ├── formatters.ts
│   │   │   │   ├── helpers.ts
│   │   │   │   └── logger.ts
│   │   │   ├── data/             # Static data
│   │   │   │   ├── seedData.ts
│   │   │   │   └── constants.ts
│   │   │   ├── app.ts            # Express app setup
│   │   │   ├── server.ts         # Server entry point
│   │   │   └── index.ts
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   ├── integration/
│   │   │   └── fixtures/
│   │   ├── .env.example
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   └── frontend/
│       ├── src/
│       │   ├── components/
│       │   │   ├── common/       # Reusable components
│       │   │   ├── dashboard/
│       │   │   ├── chat/
│       │   │   ├── leave/
│       │   │   └── auth/
│       │   ├── pages/            # Page components
│       │   ├── services/         # API client services
│       │   │   ├── api.client.ts
│       │   │   ├── chatService.ts
│       │   │   └── leaveService.ts
│       │   ├── hooks/            # React custom hooks
│       │   ├── context/          # Context API
│       │   ├── styles/           # Global styles
│       │   ├── utils/            # Frontend utilities
│       │   ├── types/            # Type definitions
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── public/
│       │   └── assets/
│       ├── tests/
│       ├── .env.example
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       └── README.md
│
├── shared/
│   ├── types/                    # Shared TypeScript types
│   ├── constants/                # Shared constants
│   └── utils/                    # Shared utilities
│
├── docs/                         # Documentation (from HRBotDoc)
│   ├── api/
│   ├── architecture/
│   ├── guides/
│   └── README.md
│
├── docker/                       # Docker configuration
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── docker-compose.yml
│
├── scripts/                      # Utility scripts
│   ├── setup.sh
│   ├── migrate.sh
│   └── seed-db.sh
│
├── .github/                      # GitHub workflows
│   └── workflows/
│
├── root files
│   ├── package.json              # Monorepo root
│   ├── tsconfig.json
│   ├── .gitignore
│   ├── .env.example
│   ├── README.md
│   └── vercel.json
```

## Migration Steps

### Phase 1: Create New Directory Structure
1. Create `apps/backend/src/` with subdirectories
2. Create `apps/frontend/src/` with subdirectories
3. Create `shared/` directory
4. Create `docs/`, `docker/`, `scripts/` directories

### Phase 2: Move Backend Files
- Move `src/controllers` → `apps/backend/src/controllers/`
- Move `src/middleware` → `apps/backend/src/middleware/`
- Move `src/models` → `apps/backend/src/models/`
- Move `src/routes` → `apps/backend/src/routes/`
- Move `src/services` → `apps/backend/src/services/`
- Move `src/types` → `apps/backend/src/types/`
- Move `src/utils` → `apps/backend/src/utils/`
- Move `src/data` → `apps/backend/src/data/`
- Move `api/*.ts` → `apps/backend/src/routes/api/`
- Move `src/app.ts` → `apps/backend/src/app.ts`
- Move `src/chatbot.ts` → `apps/backend/src/services/aiService.ts`
- Move `backend/vercel.js` → `vercel.json` (root)

### Phase 3: Move Frontend Files
- Move `hr-agent-bot/src/*` → `apps/frontend/src/`
- Move `hr-agent-bot/public/*` → `apps/frontend/public/`
- Copy `hr-agent-bot/package.json` → `apps/frontend/package.json`
- Copy `hr-agent-bot/vite.config.ts` → `apps/frontend/vite.config.ts`
- Copy `hr-agent-bot/tsconfig.json` → `apps/frontend/tsconfig.json`

### Phase 4: Move Documentation
- Move `HRBotDoc/*` → `docs/`
- Organize by category (api, guides, architecture)

### Phase 5: Update Import Paths
Update all import statements:
- Backend imports: `../../utils` → `../utils`
- Frontend imports: Adjust based on new structure
- Shared imports: `../../shared/types` → `@shared/types` (with path alias)

### Phase 6: Configuration Files
1. Create root `package.json` as monorepo
2. Create `apps/backend/package.json`
3. Create `apps/frontend/package.json`
4. Create shared `tsconfig.json` at root
5. Create `.env.example` at root
6. Create `docker-compose.yml` for local development

### Phase 7: Update Build and Deploy
- Update build scripts in `package.json`
- Update Vercel configuration
- Update GitHub Actions workflows

## File Mapping Reference

| Old Path | New Path |
|----------|----------|
| `src/app.ts` | `apps/backend/src/app.ts` |
| `src/chatbot.ts` | `apps/backend/src/services/aiService.ts` |
| `src/controllers/` | `apps/backend/src/controllers/` |
| `api/chats.ts` | `apps/backend/src/routes/api/chat.routes.ts` |
| `api/leave.ts` | `apps/backend/src/routes/api/leave.routes.ts` |
| `api/wlh.ts` | `apps/backend/src/routes/api/workFromHome.routes.ts` |
| `src/routes/` | `apps/backend/src/routes/` |
| `src/middleware/` | `apps/backend/src/middleware/` |
| `src/services/` | `apps/backend/src/services/` |
| `src/models/` | `apps/backend/src/models/` |
| `src/types/` | `apps/backend/src/types/` |
| `src/utils/` | `apps/backend/src/utils/` |
| `src/data/` | `apps/backend/src/data/` |
| `hr-agent-bot/` | `apps/frontend/` |
| `HRBotDoc/` | `docs/` |
| `backend/vercel.js` | `vercel.json` |
| `tests/` | `apps/backend/tests/` & `apps/frontend/tests/` |

## Benefits of This Structure

1. **Monorepo Organization**: Clear separation between backend and frontend
2. **Scalability**: Easy to add more apps (mobile, API, etc.)
3. **Maintainability**: Logical grouping of related files
4. **Code Reuse**: `shared/` directory for shared utilities and types
5. **Import Clarity**: Path aliases make imports more readable
6. **Testing**: Separate test directories for each app
7. **Documentation**: Centralized, well-organized docs
8. **DevOps**: Docker and scripts in dedicated directories

## TypeScript Path Aliases (tsconfig.json)

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@backend/*": ["apps/backend/src/*"],
      "@frontend/*": ["apps/frontend/src/*"],
      "@shared/*": ["shared/*"],
      "@types/*": ["shared/types/*"],
      "@constants/*": ["shared/constants/*"],
      "@utils/*": ["shared/utils/*"]
    }
  }
}
```

## Next Steps

1. Review and approve this restructuring plan
2. Create a feature branch: `feature/repo-restructure`
3. Execute migration steps in phases
4. Update all import paths
5. Run tests to verify everything works
6. Create PR for review
7. Merge to main once verified

---

Generated: December 20, 2025
For: karisnidevibalan/HR_BOT
