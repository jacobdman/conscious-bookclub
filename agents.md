# conscious-bookclub - Coding Practices & Conventions

This document outlines the coding practices, patterns, and conventions used in the CBC web application.

## Table of Contents

1. [API Service Pattern](#api-service-pattern)
2. [Component Structure](#component-structure)
3. [View Structure](#view-structure)
4. [Context Providers](#context-providers)
5. [Services Organization](#services-organization)
6. [UI Components](#ui-components)
7. [Hooks](#hooks)
8. [Import Conventions](#import-conventions)
9. [Type System](#type-system)
10. [Routes](#routes)
11. [Backend Practices](#backend-practices)
12. [Other Practices](#other-practices)

---

## API Service Pattern

### Singleton Class Pattern

The API service uses a singleton class pattern located in `src/services/api.js`. All HTTP requests go through this centralized service.

**Key Features:**
- Environment-based BASE_URL configuration
- Methods: `get`, `put`, `post`, `delete`

**Usage Example:**

```javascript
import api from 'services/api';

const res = await api.get(`/v1/goals/${goalId}`);
const goal = res.data;
```

---

## Component Structure

### Folder Organization

Each component lives in its own folder with an `index.js` file that re-exports the main component.

**Structure:**
```
src/components/
  ComponentName/
    ComponentName.js
    index.js
    utils.js (optional)
```

**Example - Goals Component:**

```javascript
// src/components/Goals/index.js
import Goals from './Goals';

export default Goals;
```

### Import Organization

Imports should be organized with comment headers in the following order:

1. `// UI` - UI components from `UI/` folder
2. `// Context` - Context hooks and providers
3. `// Components` - Other components
4. `// Utils` - Utility functions
5. `// Services` - Service functions
6. `// Hooks` - Custom hooks
7. `// Types` - Type definitions

**Example:**

```javascript
import { useContext, useState } from 'react';
// UI
import Grid from 'UI/Grid';
// Components
import Goals from 'components/Goals';
// Context
import GoalsContext from 'context/Goals/GoalsContext';
// Utils
import getPeriodBoundaries from 'utils/goalHelpers';
```

### Path Aliases

**Always use path aliases instead of relative imports.**

- ✅ `'UI/Button'`
- ❌ `'../../UI/Button'`

---

## View Structure

### Provider Wrapping Pattern

Views wrap components with providers (Context Providers and Theme Providers). Views are located in `src/views/` and serve as the entry point for routes.

**Pattern:** View → Provider → Theme Provider → Component

**Structure:**
```
src/views/
  ViewName/
    ViewName.js
    index.js
```

**Example - Goals View:**

```javascript
// src/views/Goals/Goals.js
import { default as GoalsComponent } from 'components/Goals';
import GoalsProvider from 'context/Goals/GoalsProvider';
import useGoalsContext from 'context/Goals';

const Goals = () => {
  return (
    <>
      <GoalsProvider>
        <GoalsComponent />
      </GoalsProvider>
    </>
  );
};

export default Goals;
```

```javascript
// src/views/Goals/index.js
import Goals from "./Goals";

export default Goals;
```

---

## Context Providers

### Structured Format

Context providers follow a structured format with clearly marked sections using comment headers:

**Sections (in order):**
1. `// ******************STATE VALUES**********************`
2. `// ******************EFFECTS/REACTIONS**********************`
3. `// ******************SETTERS**********************`
4. `// ******************COMPUTED VALUES**********************`
5. `// ******************UTILITY FUNCTIONS**********************`
6. `// ******************LOAD FUNCTIONS**********************`
7. `// ******************EXPORTS**********************`

### File Structure

- Context definition: `GoalsContext.js` (creates the context)
- Provider: `GoalsProvider.js` (provides the context)
- Index: `index.js` (exports the custom hook)

**Example Context Definition:**

```javascript
// src/contexts/Goals/GoalsContext.js
import React from 'react';

export default React.createContext({
  goals: [],
  loading: false,
  error: null,
  createGoal: async () => {},
  updateGoal: async () => {},
  deleteGoal: async () => {},
  getUsersGoals: async () => {},
});
```

**Example Provider:**

```javascript
// src/contexts/Goals/GoalsProvider.js
const GoalsProvider = ({ children }) => {
  // ******************STATE VALUES**********************
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ******************EFFECTS/REACTIONS**********************

  // ******************SETTERS**********************
  const createGoal = async (data) => {
    try {
      const result = await createGoal(user.uid, data);
      setGoals(prev => [...prev, result]);
      return result;
    } catch (err) {
      setError('Failed to create goal');
      console.error('Error creating goal:', err);
      throw err;
    }
  };

  // ******************UTILITY FUNCTIONS**********************

  // ******************LOAD FUNCTIONS**********************

  // ******************EXPORTS**********************
  return (
    <GoalsContext.Provider
      value={{
        goals,
        loading,
        error,
        createGoal,
        updateGoal,
        deleteGoal,
        getUsersGoals,
      }}
    >
      {children}
    </GoalsContext.Provider>
  );
};

export const useGoalsContext = () => useContext(GoalsContext);
export default GoalsProvider;
```

**Custom Hook Export:**

```typescript
// src/contexts/Goals/index.js
import { useGoalsContext } from './GoalsProvider';

export default useGoalsContext;
```

---

## Services Organization

### Domain-Based Organization

Services are organized by domain in the `src/services/` directory:

```
src/services/
  goals/
    goals.service.js
  books/
    books.service.js
```

### Naming Convention

- Service files use `.service.js` extension
- Export default object with methods

**Example API Service:**

```javascript
// src/services/goals/getGoals.service.js
import API from '../API';

const getGoals = async (userId) => {
  const goals = await API.get(`/v1/goals/${userId}`);
  return goals;
};

export default { getGoals };
```

---

## UI Components

### MUI Wrapper Pattern

UI components are wrappers around Material-UI components, located in `src/UI/`. Each component extends MUI props with custom props.
Global component defaults should be set in these components.

**Structure:**
```
src/UI/
  ComponentName/
    ComponentName.js
    index.js
```

**Example - Button Component:**

```javascript
// src/UI/Button/Button.js
import { default as MUIButton } from '@mui/material/Button';

const Button = ({ children, sx, pill = false, ...props }) => {
  return (
    <MUIButton sx={{ borderRadius: pill && '20px', ...sx }} {...props}>
      {children}
    </MUIButton>
  );
};

export default Button;
```

```javascript
// src/UI/Button/index.js
import Button from './Button';

export default Button;
```

**Example - TextField Component:**

```javascript
// src/UI/TextField/TextField.js
import {
  default as MUITextField,
} from '@mui/material/TextField';

const TextField = ({
  children,
  register = () => {},
  required,
  errorMessage,
  ...props
}) => {
  props.variant = props.variant || 'outlined';
  props.fullWidth = props.fullWidth ?? true;

  const registerOptions = {
    required: required ? 'This field is required.' : false,
  };

  const inputProps = {
    ...props.inputProps,
    ...register(props.name, registerOptions),
  };

  // ... additional logic

  return (
    <MUITextField {...props} inputProps={inputProps} InputLabelProps={InputLabelProps}>
      {children}
    </MUITextField>
  );
};

export default TextField;
```

---

## Import Conventions

### Path Aliases

**Always use path aliases configured in ...

- ✅ `import Button from 'UI/Button'`
- ✅ `import API from 'services/API'`
- ❌ `import Button from '../../UI/Button'`
- ❌ `import getGoals from '../services/goals/getGoals.service.js'`

### Import Organization

Imports should be organized with comment headers in this order:

```javascript
// React and React-related imports first
import { useContext, useState } from 'react';

// UI
import Grid from 'UI/Grid';
import Stack from 'UI/Stack';
import Typography from 'UI/Typography';

// Context
import GoalsContext from 'contexts/Goals/GoalsContext';

// Components
import GoalsCard from 'components/GoalsCard';

// Services
import API from 'services/API';
import getGoals from 'services/goals/getGoals.service.js';
```

**Available Path Aliases:**
- `UI/` → `src/UI/`
- `components/` → `src/components/`
- `contexts/` → `src/contexts/`
- `hooks/` → `src/hooks/`
- `services/` → `src/services/`
- `types/` → `src/types/`
- `utils/` → `src/utils/`
- `views/` → `src/views/`

---

## Backend Practices

For backend API, routes, controllers, and database patterns, see [functions/agents.md](../functions/agents.md).

The backend follows these key patterns:
- **API/Routes Structure**: Versioned routes under `/functions/src/routes/v1/` with separate route and controller files
- **Controller Patterns**: Express async handlers with try/catch error handling
- **DB/Models Usage**: Sequelize models with soft deletes, custom timestamps, and associations
- **Error Handling**: Global error handler middleware
- **Services Layer**: Domain-based service organization

Refer to `functions/agents.md` for complete backend coding standards and conventions.

---

## Other Practices

### Technology Stack

- **React** - UI framework
- **Material-UI (MUI)** - UI component library
- **React Router v6** - Routing
- **Firebase** - Backend services (Firestore, Storage, Auth)
- **Firebase Functions** - Backend services (Functions)
- **Axios** - HTTP client

### Code Style

- **Naming**: 
  - Components: PascalCase
  - Hooks: `use*` prefix
  - Files: Match component/function name
  - Services: `.service.js` extension
- **Exports**: Default exports for components, named exports for utilities
- **Error Handling**: Try-catch blocks with console.error for debugging

### File Organization Best Practices

1. **Component folders** should contain:
   - Main component file (`.js`)
   - `index.js` for re-export
   - Optional `utils.js` for component-specific utilities

2. **Views** should:
   - Wrap components with providers
   - Handle route-level concerns
   - Export via `index.js`

3. **Services** should:
   - Be organized by domain
   - Use `.service.js` extension
   - Export default object with methods

4. **Contexts** should:
   - Separate context definition from provider
   - Export custom hook via `index.js`
   - Follow structured comment sections

5. **UI Components** should:
   - Wrap MUI components
   - Extend MUI props with custom props
   - Export via `index.js`

---

## PWA and Deployment

### Progressive Web App (PWA) Features

The app is configured as a Progressive Web App (PWA) with the following features:

- **Service Worker**: Caches static assets and provides offline support
- **Install Prompt**: Mobile users are prompted to install the app to their home screen
- **Update Detection**: Users are notified when a new version is available
- **Manifest**: App metadata for installation and display

### Deployment Checklist

**IMPORTANT**: Before deploying a new version, you must update the version number to trigger service worker updates:

1. **Update Version**: Increment the version in `public/version.json` (NOT `package.json`)
   - Use semantic versioning (e.g., "1.0.1", "1.1.0", "2.0.0")
   - The version in `package.json` is separate and used for npm package management
   - The version in `public/version.json` is used by the PWA update system
   - During build, the version is automatically injected into the service worker file
   - This ensures the service worker file changes when the version changes, triggering browser update detection

2. **Build and Deploy**: Run the standard deployment command
   ```bash
   npm run deploy
   ```
   - The build process automatically runs `prebuild` script which injects the version from `public/version.json` into the service worker
   - The service worker's `CACHE_NAME` includes the version (e.g., `'cbc-app-v0.1.2'`), ensuring the file changes with each version update

3. **Verify**: After deployment, check that:
   - Service worker is registered (check browser DevTools → Application → Service Workers)
   - Update prompt appears for users with installed PWAs
   - New version is detected correctly

### Version Update Process

The version update flow works as follows:

1. Developer increments version in `public/version.json` before deployment
2. Build process (`prebuild` script) injects the version into `public/service-worker.js`, updating the `CACHE_NAME` constant
3. The modified service worker file is copied to `build/` directory by react-scripts
4. Browser detects the service worker file has changed (byte comparison)
5. New service worker is installed and UpdatePrompt component shows a notification to users
6. Users can choose to update immediately or later
7. On update, the service worker activates and the page reloads with the new version

**Note**: The service worker only registers in production builds. Development builds do not use service workers to avoid caching issues during development.

**Important**: Always update `public/version.json` for PWA updates. The `package.json` version is separate and does not affect PWA update detection.

### PWA Components

- **PWAInstallPrompt**: Shows installation instructions for mobile users (appears on Dashboard)
- **UpdatePrompt**: Global component that detects and prompts for service worker updates
- **pwaHelpers**: Utility functions for PWA detection (isRunningAsPWA, isMobileDevice, etc.)

---

## Summary

This codebase follows a structured, organized approach to React development with:

- **Centralized API service** for all HTTP requests
- **Clear separation** between views (providers) and components (presentation)
- **Type-safe** development with TypeScript
- **Path aliases** for clean imports
- **Organized imports** with comment headers
- **Domain-based** service organization
- **React Query** for data fetching and caching
- **MUI wrapper components** for consistent UI

When adding new features, follow these patterns to maintain consistency across the codebase.

