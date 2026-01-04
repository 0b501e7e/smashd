# 🍔 Smash'd - Multi-Platform Food Ordering System

A comprehensive food ordering platform featuring a Next.js web frontend, React Native mobile app (Expo), and a robust Node.js backend with SumUp payment integration.

## 🏗️ System Architecture

```mermaid
graph TD
    Client[Web Frontend<br/>Next.js] -->|REST API| API[Backend API<br/>Express/Node.js]
    Mobile[Mobile App<br/>React Native/Expo] -->|REST API| API
    API -->|Query| DB[(PostgreSQL<br/>Prisma ORM)]
    API -->|Payment| SumUp[SumUp Payment Gateway]
    Mobile -->|Push Notifications| Expo[Expo EAS]
```

## 📱 Platform Overview

- **Backend**: Node.js, Express, TypeScript, Prisma, PostgreSQL
- **Frontend**: Next.js (App Router), TypeScript, Tailwind CSS, Radix UI
- **Mobile**: React Native, Expo (Router & Secure Store), NativeWind
- **Payments**: SumUp (Hosted Checkout for Web, Native SDK for Mobile)

---

## 🚀 Development Environment Setup

### Prerequisites

Ensure you have the following installed before starting:

- **Node.js**: >= 18.0.0 (Recommended: LTS)
- **npm**: >= 9.0.0
- **Git**: Latest version
- **Docker**: For running the local PostgreSQL database
- **Expo CLI**: `npm install -g expo-cli` (For mobile development)

### Quick Start (Manual Setup)

Since this is a monorepo structure without a root package manager, you will need to set up each service independently.

#### 1. Database Setup
Start the local PostgreSQL instance using Docker.

```bash
# From the project root
docker-compose -f docker-compose.dev.yml up -d
```

#### 2. Backend Setup
Configure and start the API server.

```bash
cd backend

# Install dependencies
npm install

# Configure Environment
cp .env.example .env
# Edit .env and ensure DATABASE_URL matches your docker configuration:
# DATABASE_URL="postgresql://senan:postgres@localhost:5432/smashd?schema=public"

# Database Migration
npm run start # Runs migrations and starts server
# OR for development with auto-restart:
npm run dev
```

#### 3. Frontend Setup
Launch the web customer interface.

```bash
cd frontend

# Install dependencies
npm install

# Configure Environment
cp .env.example .env.local
# Verify NEXT_PUBLIC_API_URL points to your backend (default: http://localhost:5001/v1)

# Start Development Server
npm run dev
# Accessible at http://localhost:3000
```

#### 4. Mobile App Setup
Launch the Expo development server.

```bash
cd app

# Install dependencies
npm install

# Configure Environment
# Create a .env file based on your project requirements (see env.d.ts)
# EXPO_PUBLIC_API_URL=http://localhost:5001/v1

# Start Expo Go
npx expo start
# Scan the QR code with your phone or press 'i' for iOS Simulator / 'a' for Android Emulator
```

---

## 📁 Project Structure

### Backend (`/backend`)
```
├── prisma/             # Database schema and seeds
├── src/
│   ├── config/         # Environment and app configuration
│   ├── controllers/    # Request handlers
│   ├── middleware/     # Auth and validation middleware
│   ├── routes/         # API route definitions
│   ├── services/       # Business logic layer
│   └── app.ts          # Express app entry point
└── __tests__/          # Unit and integration tests
```

### Frontend (`/frontend`)
```
├── app/                # Next.js App Router pages
├── components/         # Reusable UI components (shadcn/ui)
├── lib/                # Utilities and API clients
└── public/             # Static assets
```

### Mobile App (`/app`)
```
├── app/                # Expo Router file-based navigation
├── components/         # React Native components
├── contexts/           # React Context (Auth, Cart, etc.)
└── services/           # API interaction layer
```

---

## 🏃‍♂️ Detailed "Run Locally" Guide

### Running Services Independently
For full-stack development, you typically need **three terminal windows** open:

1.  **Terminal 1 (DB & Backend)**: `docker-compose up -d && cd backend && npm run dev`
2.  **Terminal 2 (Web)**: `cd frontend && npm run dev`
3.  **Terminal 3 (Mobile)**: `cd app && npx expo start`

### Testing with Mobile Devices
If testing the mobile app on a physical device, `localhost` will not work.
1.  Find your computer's local IP address (e.g., `192.168.1.50`).
2.  Update `.env` in `backend` to allow this origin if CORS is strict.
3.  Update `EXPO_PUBLIC_API_URL` in `app/.env` to `http://192.168.1.50:5001/v1`.
4.  Restart both servers.

---

## 🛠 Best Practices & Workflow

### Git Workflow
- **Main Branch**: `main` is the production-ready branch. Do not push directly.
- **Feature Branches**: Create branches for all changes: `feature/my-new-feature` or `fix/payment-bug`.
- **Pull Requests**: All changes require a PR review before merging.

### Code Style
- **TypeScript**: Strict mode is enabled. Avoid `any` types.
- **Linting**: Run `npm run lint` (in respective folders) before committing.
- **Formatting**: We use Prettier. Ensure your editor is configured to format on save.

### Testing Strategy
- **Backend**:
    - Unit Tests: `npm run test:unit`
    - Integration Tests: `npm run test:integration` (Requires running DB)
- **Frontend/Mobile**:
    - Jest is configured for component testing.
    - `npm test` runs the test suite.

---

## 🌍 Production Setup & Deployment

### Backend (Railway / VPS)
1.  **Build**: `npm run build` (Compiles TS to JS in `dist/`).
2.  **Environment**: ensure `NODE_ENV=production`. Set strict `ALLOWED_ORIGINS`.
3.  **Database**: Use a managed PostgreSQL provider (e.g., Railway, Neon, AWS RDS). Apply migrations via `npx prisma migrate deploy`.

### Frontend (Vercel)
1.  Connect your repository to Vercel.
2.  Set Root Directory to `frontend`.
3.  Add Environment Variables (`NEXT_PUBLIC_...`).
4.  Vercel automatically detects Next.js and builds using `npm run build`.

### Mobile (Expo EAS)
1.  Install EAS CLI: `npm install -g eas-cli`.
2.  Login: `eas login`.
3.  Configure Build: Update `eas.json` for build profiles (dev/preview/production).
4.  **Build for Stores**:
    ```bash
    cd app
    eas build --platform ios
    eas build --platform android
    ```
5.  **OTA Updates**: Use `eas update` to push non-native changes instantly.

---

## ❓ Troubleshooting

**Q: Backend cannot connect to Database?**
A: Check if Docker is running (`docker ps`). Ensure the `DATABASE_URL` matches the exposed port (default 5432).

**Q: CORS Errors on Frontend?**
A: Add your frontend URL (e.g., `http://localhost:3000`) to `ALLOWED_ORIGINS` in `backend/.env`.

**Q: "Network Error" on Android Emulator?**
A: Android emulators see host `localhost` as `10.0.2.2`. Use that IP or your machine's LAN IP.
