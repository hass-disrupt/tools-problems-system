import Link from 'next/link';
import ToolForm from '@/components/ToolForm';

export default function AddToolPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link
            href="/"
            className="text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block"
          >
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mt-4">
            Add a New Tool
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2">
            Enter a URL and we'll extract information about the tool using AI. Only B2B SaaS, B2C SaaS, and AI tools are accepted. Shopping websites and irrelevant sites will be rejected.
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
          <ToolForm />
        </div>
      </div>
    </div>
  );
}

