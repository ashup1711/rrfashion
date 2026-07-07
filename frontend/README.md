# RR FASHION — Frontend

This is the React + Vite frontend for the RR FASHION e-commerce platform.

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 6
- **Routing**: React Router v6
- **State Management**: Zustand (client) + TanStack Query (server)
- **HTTP Client**: Axios
- **Styling**: Tailwind CSS
- **Linting**: ESLint

## Getting Started

```bash
# Install dependencies
npm install

# Start development server (proxies /api to localhost:3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── api/          # API client and service functions
├── components/   # Shared UI components
│   ├── common/   # Reusable common components
│   ├── layout/   # Layout components (Header, Footer, etc.)
│   └── ui/       # Primitive UI components
├── hooks/        # Custom React hooks (React Query wrappers)
├── pages/        # Page components (feature-based)
├── routes/       # Route definitions
├── store/        # Zustand state stores
├── styles/       # Global styles and theme
├── types/        # TypeScript type definitions
└── utils/        # Utility functions
```
