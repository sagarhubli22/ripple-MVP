# Ripple MVP

Bootstrap Next.js + TypeScript + Tailwind shell for the Ripple dashboard.

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Run the dev server**
   ```bash
   npm run dev
   ```
   The app will be available at http://localhost:3000.

## Supabase Environment

Create a `.env.local` file in the project root and add:

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

These values come from your Supabase project dashboard. The client-side dashboard will surface a helpful message if the variables are missing.

