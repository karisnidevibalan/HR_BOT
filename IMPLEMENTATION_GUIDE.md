# Implementation Guide - HR_BOT Repository Restructuring

This guide provides step-by-step instructions for executing the repository restructuring plan defined in `RESTRUCTURING_PLAN.md`.

## Prerequisites

- Node.js v16+ installed
- Git CLI installed
- VS Code or preferred IDE
- Access to the repository
- Understanding of the current project structure

## Quick Start Checklist

- [ ] Read `RESTRUCTURING_PLAN.md` completely
- [ ] Create a new branch: `feature/repo-restructure`
- [ ] Back up current code locally
- [ ] Follow migration phases in order
- [ ] Update import paths after each phase
- [ ] Test functionality after each phase
- [ ] Create PR for review

## Phase-by-Phase Execution Guide

### Phase 1: Create New Directory Structure

#### Step 1.1: Create Backend Directory Structure
```bash
# From repository root
mkdir -p apps/backend/src/{config,controllers,middleware,models,routes/api,services,types,utils,data}
mkdir -p apps/backend/tests/{unit,integration,fixtures}
```

#### Step 1.2: Create Frontend Directory Structure
```bash
mkdir -p apps/frontend/src/{components/{common,dashboard,chat,leave,auth},pages,services,hooks,context,styles,utils,types}
mkdir -p apps/frontend/public/assets
mkdir -p apps/frontend/tests
```

#### Step 1.3: Create Shared and Documentation Directories
```bash
mkdir -p shared/{types,constants,utils}
mkdir -p docs/{api,architecture,guides}
mkdir -p docker
mkdir -p scripts
```

### Phase 2: Move Backend Files

#### Step 2.1: Move Existing Backend Controllers
```bash
# Move controller files
mv src/controllers/* apps/backend/src/controllers/
```

#### Step 2.2: Move Routes
```bash
# Move existing routes
mv src/routes/* apps/backend/src/routes/

# Move API route files
mv api/{chats.ts,chatConversation.ts,leave.ts,wlh.ts} apps/backend/src/routes/api/

# Rename for clarity
mv apps/backend/src/routes/api/chats.ts apps/backend/src/routes/api/chat.routes.ts
mv apps/backend/src/routes/api/leave.ts apps/backend/src/routes/api/leave.routes.ts
mv apps/backend/src/routes/api/wlh.ts apps/backend/src/routes/api/workFromHome.routes.ts
mv apps/backend/src/routes/api/chatConversation.ts apps/backend/src/routes/api/chatConversation.routes.ts
```

#### Step 2.3: Move Middleware
```bash
mv src/middleware/* apps/backend/src/middleware/
```

#### Step 2.4: Move Models
```bash
mv src/models/* apps/backend/src/models/
```

#### Step 2.5: Move Services
```bash
mv src/services/* apps/backend/src/services/
# Rename chatbot.ts to aiService.ts for clarity
mv apps/backend/src/services/chatbot.ts apps/backend/src/services/aiService.ts
```

#### Step 2.6: Move Types
```bash
mv src/types/* apps/backend/src/types/
```

#### Step 2.7: Move Utils and Data
```bash
mv src/utils/* apps/backend/src/utils/
mv src/data/* apps/backend/src/data/
```

#### Step 2.8: Move Main App Files
```bash
mv src/app.ts apps/backend/src/app.ts
mv src/index.ts apps/backend/src/index.ts
cp src/build.js apps/backend/build.js
```

#### Step 2.9: Move Configuration
```bash
# Copy environment example
cp .env.example apps/backend/.env.example
```

### Phase 3: Move Frontend Files

#### Step 3.1: Move Frontend Source
```bash
# Copy frontend files to new location
cp -r hr-agent-bot/src/* apps/frontend/src/

# Copy public assets
cp -r hr-agent-bot/public/* apps/frontend/public/

# Copy configuration files
cp hr-agent-bot/package.json apps/frontend/package.json
cp hr-agent-bot/vite.config.ts apps/frontend/vite.config.ts
cp hr-agent-bot/tsconfig.json apps/frontend/tsconfig.json
cp hr-agent-bot/.env.example apps/frontend/.env.example 2>/dev/null || echo "No .env.example in frontend"
```

### Phase 4: Move Documentation
```bash
# Move documentation files
cp -r HRBotDoc/* docs/

# Organize by category
mkdir -p docs/{api,guides,architecture}
# Move files to appropriate subdirectories based on content
```

### Phase 5: Create Configuration Files at Root Level

#### Step 5.1: Create Root package.json (Monorepo)
```json
{
  "name": "hr-bot",
  "version": "1.0.0",
  "description": "HR Agent Bot - Full-stack application",
  "private": true,
  "workspaces": [
    "apps/backend",
    "apps/frontend"
  ],
  "scripts": {
    "install:all": "npm install && npm install -w apps/backend && npm install -w apps/frontend",
    "dev": "npm run dev -w apps/backend & npm run dev -w apps/frontend",
    "dev:backend": "npm run dev -w apps/backend",
    "dev:frontend": "npm run dev -w apps/frontend",
    "build": "npm run build -w apps/backend && npm run build -w apps/frontend",
    "build:backend": "npm run build -w apps/backend",
    "build:frontend": "npm run build -w apps/frontend",
    "test": "npm test -w apps/backend && npm test -w apps/frontend",
    "test:backend": "npm test -w apps/backend",
    "test:frontend": "npm test -w apps/frontend",
    "lint": "npm run lint -w apps/backend && npm run lint -w apps/frontend",
    "format": "prettier --write '**/*.{ts,tsx,json,md}'"
  }
}
```

#### Step 5.2: Create Root tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
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

#### Step 5.3: Create Root .env.example
```env
# Backend Configuration
BACKEND_PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hr_bot
DB_USER=user
DB_PASSWORD=password

# Salesforce Configuration
SALESFORCE_INSTANCE_URL=https://your-instance.salesforce.com
SALESFORCE_CLIENT_ID=your_client_id
SALESFORCE_CLIENT_SECRET=your_client_secret

# Frontend Configuration
VITE_API_URL=http://localhost:5000

# AI/LLM Configuration
OPENAI_API_KEY=your_api_key
```

### Phase 6: Update Import Paths

#### Step 6.1: Update Backend Imports
Find and replace in all backend files:
- `import ... from '../services'` → `import ... from '../services'`
- Relative paths will work correctly once files are moved

#### Step 6.2: Add Path Aliases
Update `apps/backend/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

### Phase 7: Cleanup Old Directories

#### Step 7.1: Verify All Files Are Moved
```bash
# Check if old src directory is empty
ls -la src/
ls -la api/
ls -la backend/
ls -la hr-agent-bot/
```

#### Step 7.2: Remove Old Directories
```bash
# Only after verifying all files are moved!
rm -rf src
rm -rf api
rm -rf backend
```

Or keep them for reference initially:
```bash
# Rename instead of delete for safety
mv src src.old
mv api api.old
mv backend backend.old
mv hr-agent-bot hr-agent-bot.old
```

### Phase 8: Install Dependencies

```bash
# From root directory
npm install

# This will install dependencies for all workspaces
```

### Phase 9: Test and Verify

#### Step 9.1: Test Backend
```bash
cd apps/backend
npm run dev
# Verify no import errors
```

#### Step 9.2: Test Frontend
```bash
cd apps/frontend
npm run dev
# Verify no import errors and UI loads
```

#### Step 9.3: Run Tests
```bash
npm run test
```

### Phase 10: Update CI/CD Configuration

#### Step 10.1: Update .github/workflows
Update workflow files to build from new locations:
```yaml
- name: Build Backend
  run: npm run build:backend

- name: Build Frontend
  run: npm run build:frontend
```

#### Step 10.2: Update Deployment Configuration
Update `vercel.json`:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "apps/frontend/dist",
  "env": {
    "VITE_API_URL": "@vite-api-url"
  },
  "functions": {
    "api/**/*.ts": {
      "runtime": "nodejs18.x"
    }
  }
}
```

## Troubleshooting

### Issue: Import path errors after moving files
**Solution**: Update all relative import paths. Use VS Code's find and replace with regex.

### Issue: Module not found errors
**Solution**: Verify tsconfig.json paths are correct and file locations match.

### Issue: Tests failing
**Solution**: Update test paths and imports, clear node_modules and reinstall.

### Issue: Build failures
**Solution**: Check build scripts in package.json reference correct directories.

## Verification Checklist

After completing all phases:

- [ ] All directories created successfully
- [ ] All files moved to correct locations
- [ ] No broken import paths
- [ ] Backend starts without errors: `npm run dev:backend`
- [ ] Frontend starts without errors: `npm run dev:frontend`
- [ ] Tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] Deployment works on Vercel/hosting platform
- [ ] Git history preserved with commits
- [ ] Code review approved
- [ ] All team members notified of structure change

## Next Steps After Restructuring

1. Document the new structure in a team wiki/README
2. Update developer onboarding guide
3. Create examples for common tasks with new structure
4. Establish coding conventions for the monorepo
5. Set up shared utilities in `shared/` folder
6. Configure ESLint and Prettier for entire monorepo
7. Add pre-commit hooks (husky) for code quality
8. Update deployment pipeline documentation

## References

- Main restructuring plan: `RESTRUCTURING_PLAN.md`
- Git documentation: https://git-scm.com/doc
- Monorepo best practices: https://monorepo.tools/
- TypeScript path mapping: https://www.typescriptlang.org/tsconfig#paths

---

Last Updated: December 20, 2025
Author: Repository Restructuring Task
