This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app) and integrated with [Supabase](https://supabase.com).

## Getting Started

### 1. Set up Supabase

1. Create a new project at [Supabase](https://app.supabase.com)
2. Get your project URL and anon key from your project settings: `Settings` → `API`
3. Run the database migration:
   - Go to your Supabase project dashboard
   - Navigate to `SQL Editor`
   - Copy the contents of `supabase/migrations/001_create_tables.sql`
   - Paste and run it to create the `tools` and `problems` tables

### 2. Set up OpenAI

1. Get your API key from [OpenAI](https://platform.openai.com/api-keys)
2. Add it to your `.env.local` file

### 3. Environment Variables

Create a `.env.local` file in the root directory:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
```

### 4. Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Tools & Problems System

This application allows you to:

1. **Add Tools**: Submit a URL and AI will extract detailed information about the tool including:
   - Title and description
   - Category and tags
   - Specific problem it solves
   - Target audience

2. **Submit Problems**: Describe a problem you're facing and the system will:
   - Search existing tools for solutions (keyword + semantic matching)
   - Suggest new tools using AI if no match is found
   - Identify opportunities if no solution exists

### Features

- **Precision Matching**: Uses hybrid matching (keyword search + semantic similarity) to find exact solutions
- **AI-Powered Extraction**: Automatically extracts structured data from tool URLs
- **Intelligent Suggestions**: Suggests new tools when no existing solution is found
- **Opportunity Detection**: Identifies gaps where new solutions are needed

### Pages

- `/` - Dashboard with recent tools and navigation
- `/add-tool` - Form to add a new tool by URL
- `/add-problem` - Form to submit a problem and find solutions

## Supabase Integration

This project includes Supabase client utilities:

- **Client-side**: `src/lib/supabase/client.ts` - Use `createClient()` for client components
- **Server-side**: `src/lib/supabase/server.ts` - Use `createClient()` for server components and API routes
- **Middleware**: `src/middleware.ts` - Handles authentication and session management

### Usage Examples

**Client Component:**
```typescript
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
const { data } = await supabase.from('your_table').select()
```

**Server Component:**
```typescript
import { createClient } from '@/lib/supabase/server'

const supabase = await createClient()
const { data } = await supabase.from('your_table').select()
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [Supabase Documentation](https://supabase.com/docs) - learn about Supabase features and API.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
