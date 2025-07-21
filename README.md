# 🍔 Smash'd - Multi-Platform Food Ordering System

A comprehensive food ordering platform with web frontend, React Native mobile app, and Node.js backend with SumUp payment integration.

## 📱 Platform Overview

- **Backend**: Node.js + TypeScript + Prisma + PostgreSQL
- **Frontend**: Next.js + TypeScript + Tailwind CSS  
- **Mobile**: React Native + Expo + TypeScript
- **Payments**: SumUp (Hosted Checkout + Native SDK)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT + AsyncStorage/localStorage
- **Notifications**: Push notifications via Expo

## 🚀 Development Environment Setup

### Prerequisites

```bash
# Required tools
node >= 18.0.0
npm >= 9.0.0
git
postgresql
expo-cli (for mobile development)
```

### Quick Start (All Platforms)

```bash
# Clone and setup
git clone <repository-url>
cd smashd

# Install all dependencies
npm run install:all  # (if you create this script)

# Or install manually:
cd backend && npm install
cd ../frontend && npm install  
cd ../app && npm install
```

## 🔧 Environment Configuration

### Backend (.env.development)
```env
# Database
DATABASE_URL="postgresql://user@localhost:5432/smashd_dev?schema=public"

# API
NODE_ENV=development
PORT=5001
JWT_SECRET="development-secret"

# SumUp (use your real keys for testing)
SUMUP_CLIENT_ID=cc_classic_xBuYRPZElJofF1DmpYo7Yq74k0Ay5
SUMUP_CLIENT_SECRET=cc_sk_classic_...
SUMUP_MERCHANT_EMAIL=your@email.com
SUMUP_WEBHOOK_SECRET="dev_webhook_secret"

# URLs
FRONTEND_URL="http://localhost:3000"
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:19006,http://192.168.1.100:3000"
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:5001/v1
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### React Native (.env)
```env
EXPO_PUBLIC_API_URL=http://localhost:5001/v1
EXPO_PUBLIC_SUMUP_PUBLIC_KEY=sup_pk_...
EXPO_PUBLIC_APP_ENV=development
```

## 🏃‍♂️ Development Workflow

### Start All Services

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend  
npm run dev

# Terminal 3: React Native
cd app
expo start
```

### Development Profiles

#### 1. **Full Stack Development**
```bash
# Backend + Frontend + Database
npm run dev:web
```

#### 2. **Mobile Development**  
```bash
# Backend + React Native
npm run dev:mobile
```

#### 3. **Backend Only**
```bash
# API development and testing
cd backend && npm run dev
```

## 🔄 API Endpoints Alignment

### Current Status:
- ✅ Authentication (`/v1/auth/*`)
- ✅ Menu Management (`/v1/menu/*`)  
- ✅ Order Management (`/v1/orders/*`)
- ✅ User Management (`/v1/users/*`)
- ✅ Payment Integration (`/v1/payment/*`)
- ⚠️ Analytics (`/v1/analytics/*`) - Web only
- ⚠️ Admin Panel - Web only

### Platform-Specific Differences:

| Feature | Web Frontend | React Native | Status |
|---------|--------------|--------------|---------|
| Authentication | JWT + localStorage | JWT + AsyncStorage | ✅ Aligned |
| Payment Flow | SumUp Hosted Checkout | SumUp Native SDK | ⚠️ Different approaches |
| Guest Mode | Basic support | Full guest flow | ⚠️ Enhance web |
| Push Notifications | Not implemented | Full Expo integration | ⚠️ Missing on web |
| Analytics Dashboard | Full admin panel | Not implemented | ⚠️ Missing on mobile |

## 🧪 Testing Strategy

### Backend API Testing
```bash
cd backend
npm run test
npm run test:integration
```

### Frontend Testing  
```bash
cd frontend
npm run test
npm run build  # Verify production build
```

### React Native Testing
```bash
cd app
npm run test
expo build:ios --simulator  # iOS testing
expo build:android  # Android testing
```

## 📱 Mobile Development Setup

### iOS Development
```bash
cd app
expo run:ios
# Requires Xcode and iOS Simulator
```

### Android Development  
```bash
cd app
expo run:android  
# Requires Android Studio and Android SDK
```

### Web Testing (React Native)
```bash
cd app
expo start --web
# Test React Native app in browser
```

## 🚀 Deployment

### Backend (Production)
- Platform: Railway/Heroku
- Database: PostgreSQL (Railway/Neon)
- Environment: Production `.env`

### Frontend (Production)
- Platform: Vercel/Netlify
- Environment: Production env vars

### React Native (Production)
- Platform: Expo EAS Build
- iOS: App Store Connect
- Android: Google Play Console

## 🔍 Development Tips

### API Development
- Use Prisma Studio for database inspection: `npx prisma studio`
- Test SumUp integration: `curl http://localhost:5001/v1/test/sumup-connection`
- Monitor logs: Backend shows all API calls and database queries

### Frontend Development  
- Use Next.js dev tools for debugging
- Test responsive design across devices
- Verify payment flow end-to-end

### React Native Development
- Use Expo dev tools for debugging  
- Test on physical devices for best experience
- Use Expo Go app for quick testing

### Common Issues & Solutions
- **API Connection Issues**: Check CORS settings in backend
- **Payment Integration**: Verify SumUp credentials in environment
- **Database Issues**: Run `npx prisma generate && npx prisma db push`
- **React Native Metro Issues**: Clear cache with `expo r -c`

## 📚 Additional Resources

- [Backend API Documentation](./backend/README.md)
- [Frontend Development Guide](./frontend/README.md)  
- [React Native Development Guide](./app/README.md)
- [SumUp Integration Guide](./docs/SUMUP_INTEGRATION.md)

## 🤝 Contributing

1. Create feature branch from `main`
2. Develop and test across platforms
3. Ensure API parity between web/mobile
4. Submit PR with platform testing notes
