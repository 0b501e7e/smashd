# SMASHD Backend API

The backend service for the SMASHD burger ordering platform, providing APIs for both the mobile app and web frontend.

## 🛠️ Tech Stack

- **Node.js** with **Express.js** - Web server framework
- **Prisma ORM** - Database ORM
- **PostgreSQL** - SQL database
- **JWT** - Authentication
- **bcrypt** - Password hashing

## 📊 Database Schema

The application uses a PostgreSQL database with the following main models:

- **User** - Customer and staff accounts
- **MenuItem** - Available food and drink items
- **Order** - Customer orders
- **OrderItem** - Individual items in an order
- **LoyaltyPoints** - Customer loyalty program

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication with the following roles:
- **ADMIN** - Full system access
- **STAFF** - Order management access
- **CUSTOMER** - Standard user access

## 🚦 API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Authenticate a user

### Menu
- `GET /api/menu` - Get all menu items
- `GET /api/menu/:id` - Get a specific menu item
- `POST /api/menu` - Create a new menu item (admin only)
- `PUT /api/menu/:id` - Update a menu item (admin only)
- `DELETE /api/menu/:id` - Delete a menu item (admin only)

### Orders
- `GET /api/orders` - Get all orders (admin/staff) or user's orders (customer)
- `GET /api/orders/:id` - Get a specific order
- `POST /api/orders` - Create a new order
- `PUT /api/orders/:id` - Update an order status
- `DELETE /api/orders/:id` - Cancel an order

### Payments
- Integration with payment processing system

## 🚀 Development

### Prerequisites
- Node.js (v16+)
- PostgreSQL
- npm or yarn

### Setup
1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   Create a `.env` file with the following variables:
   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/smashd?schema=public"
   JWT_SECRET="your-secret-key"
   JWT_EXPIRES_IN="24h"
   ```

3. Set up the database:
   ```bash
   npx prisma migrate dev
   npx prisma db seed
   ```

4. Start the server:
   ```bash
   node server.js
   ```

## 📝 Database Migrations

```bash
# Create a new migration
npx prisma migrate dev --name your_migration_name

# Apply migrations to production
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

## 🗄️ Seeding Data

The application includes a seed script to populate initial data:

```bash
npm run seed
``` 