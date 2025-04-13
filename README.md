# SMASHD Monorepo

A full-stack application comprised of a Next.js website, React Native mobile app, and Node.js backend. [**Add a brief description of the application's purpose here.**]

## �� Project Structure

This monorepo contains three main components:

- **`/app`** - React Native mobile application built with Expo
- **`/frontend`** - Web application built with Next.js
- **`/backend`** - API server built with Express and Prisma

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn
- PostgreSQL (for backend)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/0b501e7e/smashd.git
   cd smashd
   ```

2. Install dependencies for each project:

   ```bash
   # Backend
   cd backend
   npm install
   cp .env.example .env  # Configure your database connection and other environment variables
   # Set up PostgreSQL database according to .env
   npx prisma migrate dev # Apply database migrations
   npm run seed         # Seed the database (if applicable)
   
   # Frontend
   cd ../frontend
   npm install
   # Create a .env file if needed for frontend-specific variables
   
   # Mobile App
   cd ../app
   npm install
   # Create a .env file in the 'app' directory and add necessary variables.
   # Example:
   # EXPO_PUBLIC_API_URL=http://your_backend_url
   # EXPO_PUBLIC_SUMUP_PUBLIC_KEY=your_sumup_public_key
   # ... add other keys as needed
   ```

## 💻 Running the Projects

### Backend

```bash
cd backend
npm run dev  # Development server
# or
npm start    # Production server
```

**Testing:**
```bash
npm test
```

The server will be available at `http://localhost:8000` (or the port defined in your .env).

### Frontend (Next.js)

```bash
cd frontend
npm run dev
```

**Testing:**
```bash
npm run lint # Or other test/lint commands defined in package.json
```

The website will be available at `http://localhost:3000`.

### Mobile App (React Native)

```bash
cd app
npm start    # Starts the Expo development server
```

**Testing:**
```bash
npm test
npm run lint
```

Follow the instructions in the terminal to run on iOS, Android, or web.

## 🛠️ Technologies

### Backend
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT
- **Testing**: Jest

### Frontend
- **Framework**: Next.js 14
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **Animation**: Framer Motion

### Mobile App
- **Framework**: React Native with Expo
- **Navigation**: Expo Router
- **State Management**: React Context
- **Storage**: AsyncStorage, SecureStore
- **Network**: Axios

## 📱 Mobile App Features

The React Native application includes:
- Authentication system
- Navigation with Expo Router
- Secure data storage
- Network status monitoring
- Haptic feedback
- Localization support

## 🌐 Frontend Features

The Next.js website includes:
- Modern, responsive UI
- Server-side rendering
- Type-safe development with TypeScript
- Component-based architecture
- Tailwind for styling

## 🖥️ Backend Features

The Express.js server includes:
- RESTful API endpoints
- Database integration with Prisma
- Authentication and authorization
- Input validation
- Comprehensive test suite

## 📂 Development Workflow

1. Make changes in the appropriate project directory
2. Test your changes locally
3. Commit and push your changes

## 📄 License

This project is licensed under the [MIT License](LICENSE).
