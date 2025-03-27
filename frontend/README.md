# SMASHD Web Application

The web frontend for the SMASHD burger ordering platform, allowing customers to browse the menu, place orders, and manage their accounts.

## 🛠️ Tech Stack

- **Next.js** - React framework with server-side rendering
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn UI** - Accessible UI components
- **Framer Motion** - Animation library

## 🧩 Features

- **User Authentication** - Register, login, and profile management
- **Menu Browsing** - View all available menu items
- **Cart System** - Add items to cart and manage quantities
- **Order Placement** - Complete the checkout process
- **Payment Integration** - Secure payment processing
- **Order History** - View past orders and their status
- **Responsive Design** - Works on all devices

## 📁 Project Structure

```
frontend/
├── app/                # Next.js pages and routing
│   ├── components/     # Page-specific components
│   ├── login/          # Login page
│   ├── register/       # Registration page
│   ├── profile/        # User profile
│   ├── checkout/       # Checkout process
│   ├── order-confirmation/ # Order confirmation
│   └── payment/        # Payment handling
├── public/             # Static assets
├── lib/                # Shared utilities
├── components/         # Reusable components
└── ...
```

## 🚀 Development

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

### Prerequisites

- Node.js (v18+)
- npm or yarn

### Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   Create a `.env.local` file with the following variables:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:3001/api
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to see the result.

### Building for Production

```bash
npm run build
npm start
```

## 📝 API Integration

The web application communicates with the backend API for all data operations:

- User authentication
- Fetching menu items
- Submitting orders
- Processing payments

## 🧪 Testing

```bash
npm run test
```

## 📚 Learn More

To learn more about the technologies used in this project:

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Shadcn UI](https://ui.shadcn.com)
- [Framer Motion](https://www.framer.com/motion/)

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
