# Conscious Book Club (CBC)

A Progressive Web App (PWA) for managing book clubs focused on philosophical discussions, personal growth, and community building. The app helps book club members track reading goals, manage meetings, share posts, and stay accountable to their personal development goals.

## Overview

Conscious Book Club is designed for book clubs that follow a quarterly rotation of topics, keeping discussions fresh and engaging. The platform emphasizes self-improvement and consistency over raw volume, helping members build meaningful reading habits and achieve personal goals.

### Key Features

- **Book Clubs**: Create and manage book clubs with invite codes
- **Goals Tracking**: Set and track personal reading goals and habits with weighted consistency metrics
- **Meetings & Calendar**: Schedule and manage book club meetings with calendar integration
- **Social Feed**: Share posts, reactions, and discussions about books and topics
- **Progress Reports**: Visualize reading progress, goal completion, and habit consistency
- **User Profiles**: Manage your profile and view personal statistics
- **PWA Support**: Install as a mobile app with offline support and update notifications

## Technology Stack

### Frontend

- **React** 19.1.0 - UI framework
- **Material-UI (MUI)** 7.0.2 - Component library
- **React Router** v7.9.4 - Client-side routing
- **Recharts** 3.3.0 - Data visualization
- **Socket.io Client** 4.7.2 - Real-time communication

### Backend

- **Firebase Functions** 6.5.0 - Serverless backend
- **Express** 4.18.2 - API framework
- **PostgreSQL** - Relational database
- **Sequelize** 6.35.0 - ORM
- **Socket.io** - Real-time WebSocket server

### Services

- **Firebase Auth** - User authentication (Google OAuth)
- **Firebase Storage** - File storage
- **Firebase Hosting** - Static site hosting

### Development Tools

- **React Scripts** 5.0.1 - Build tooling
- **Concurrently** 9.2.1 - Run multiple processes
- **Firebase Emulators** - Local development

## Local Development

### Prerequisites

- **Node.js** 22 (required for backend functions)
- **npm** (comes with Node.js)
- **Firebase CLI** - Install globally: `npm install -g firebase-tools`
- **PostgreSQL Database Access** - Environment variable `DATABASE_URL` must be configured

### Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd conscious-bookclub
   ```

2. **Install dependencies**

   ```bash
   # Install root dependencies
   npm install
   
   # Install backend function dependencies
   cd functions
   npm install
   cd ..
   
   # Install socket service dependencies
   cd socket-service
   npm install
   cd ..
   ```

3. **Configure environment variables**

   Create a `.env` file in the `functions/` directory with:

   ```env
   DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
   ```

   **Note**: See the Critical Warning section below about database configuration.

4. **Start development servers**

   ```bash
   npm run dev
   ```

   This command runs three services concurrently:
   - **React App** - Frontend development server ([http://localhost:3000](http://localhost:3000))
   - **Firebase Emulators** - Functions, Auth, Storage emulators ([http://localhost:5001](http://localhost:5001))
   - **Socket Service** - WebSocket server ([http://localhost:3001](http://localhost:3001))
   - **Emulator UI** - Firebase Emulator Suite UI ([http://localhost:4000](http://localhost:4000))

### Development Ports

- **3000** - React development server
- **4000** - Firebase Emulator Suite UI
- **5001** - Firebase Functions emulator
- **5002** - Firebase Hosting emulator
- **9099** - Firebase Auth emulator
- **9199** - Firebase Storage emulator
- **3001** - Socket.io server (local development)

### Other Commands

- `npm start` - Run React app only
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run deploy` - Build and deploy to Firebase
- `npm run emulators` - Run Firebase emulators only
- `npm run emulators:ui` - Run Firebase Emulator UI only

## ⚠️ Critical Warning

### Production Database Connection

**IMPORTANT**: Local development connects to the **production PostgreSQL database**.

The database configuration in `functions/config/database.js` uses the same `DATABASE_URL` environment variable for both development and production environments. This means:

- **All local database operations affect production data**
- **Be extremely careful when testing database operations locally**
- **Avoid running migrations or destructive operations during local development**
- **Use test data carefully and clean up after testing**

Both `development` and `production` configurations in the database config file use the same connection settings:

```javascript
development: {
  ...dbConfig,  // Same DATABASE_URL
  dialect: "postgres",
},
production: {
  ...dbConfig,  // Same DATABASE_URL
  dialect: "postgres",
}
```

**Recommendation**: Consider setting up a separate development database or using database transactions/rollbacks for local testing to prevent accidental data modification.

## Project Structure

```text
conscious-bookclub/
├── src/                          # Frontend React application
│   ├── components/              # Reusable UI components
│   ├── views/                   # Page-level components (routes)
│   ├── contexts/                # React Context providers
│   ├── services/                # API and service layer
│   ├── UI/                      # MUI wrapper components
│   ├── utils/                   # Utility functions
│   ├── App.js                   # Main app component with routing
│   └── index.js                 # Entry point
│
├── functions/                   # Backend Firebase Functions
│   ├── src/
│   │   ├── routes/              # API route handlers
│   │   │   └── v1/              # Versioned API routes
│   │   └── socket/              # Socket.io handlers
│   ├── db/
│   │   └── models/              # Sequelize models
│   ├── migrations/              # Database migrations
│   ├── config/
│   │   └── database.js          # Database configuration
│   └── index.js                 # Functions entry point
│
├── socket-service/              # Standalone Socket.io server
│   └── server.js                # Socket server implementation
│
├── public/                      # Static assets
│   ├── service-worker.js        # PWA service worker
│   └── version.json             # App version (for PWA updates)
│
├── scripts/                     # Build scripts
│   └── inject-service-worker-version.js
│
├── firebase.json                # Firebase configuration
├── jsconfig.json                # Path aliases configuration
└── package.json                 # Root dependencies and scripts
```

### Path Aliases

The project uses path aliases configured in `jsconfig.json`:

- `UI/*` → `src/UI/*`
- `components/*` → `src/components/*`
- `views/*` → `src/views/*`
- `contexts/*` → `src/contexts/*`
- `services/*` → `src/services/*`
- `utils/*` → `src/utils/*`
- `hooks/*` → `src/hooks/*`
- `types/*` → `src/types/*`

**Always use path aliases instead of relative imports** (e.g., `import Button from 'UI/Button'` not `import Button from '../../UI/Button'`).

## Deployment

### Build and Deploy

```bash
npm run deploy
```

This command:

1. Runs the `prebuild` script to inject the version into the service worker
2. Builds the React app for production
3. Deploys to Firebase Hosting and Functions

### Version Management

Before deploying, update the version in `public/version.json` (not `package.json`). This version is used by the PWA update system to trigger service worker updates.

## Progressive Web App (PWA)

The app is configured as a Progressive Web App with:

- **Service Worker**: Caches static assets and provides offline support
- **Install Prompt**: Mobile users can install the app to their home screen
- **Update Detection**: Users are notified when a new version is available
- **Manifest**: App metadata for installation and display

The service worker only registers in production builds. Development builds do not use service workers to avoid caching issues during development.

## Coding Practices

This project follows structured coding conventions and patterns. For detailed information about:

- API Service Pattern
- Component Structure
- View Structure
- Context Providers
- Services Organization
- UI Components
- Import Conventions
- Backend Practices

See **[agents.md](./agents.md)** for complete coding standards and conventions.

## License

[Add your license information here]

## Contributing

[Add contribution guidelines here]
