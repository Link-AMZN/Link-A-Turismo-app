# Link-A Moçambique

## Overview
Link-A is a full-stack tourism platform for Mozambique, offering:
- Secure ride sharing with verified drivers
- Unique hotel and accommodation bookings
- Cultural events and festivals

## Project Architecture

### Frontend (`backend/frontend/`)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with Radix UI components
- **State Management**: TanStack Query
- **Port**: 5000 (development)

### Backend (`backend/backend/`)
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Firebase Auth (requires configuration)
- **Port**: 8000 (development)

## Running the Application

Two workflows are configured:
1. **Backend API**: Runs the Express server on port 8000
2. **Frontend**: Runs Vite dev server on port 5000 (proxies /api to backend)

## Required Environment Variables

### Backend (Firebase Authentication)
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

### Frontend (Vite)
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`

## Deployment

The application is configured for autoscale deployment:
- Build: Compiles frontend with Vite and backend with esbuild
- Run: Starts the production Express server that serves the frontend build

## Recent Changes
- 2025-12-12: Configured for Replit environment
  - Added `allowedHosts: true` to Vite config for Replit proxy
  - Updated CORS to allow all origins in development mode
  - Set up workflows for frontend (port 5000) and backend (port 8000)
  - Configured autoscale deployment
