import Link from 'next/link';
import ProblemForm from '@/components/ProblemForm';

export default function AddProblemPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link
            href="/"
            className="text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block"
          >
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mt-4">
            Submit a Problem
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2">
            Describe your problem and we'll find tools that solve it, or identify it as an opportunity.
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
          <ProblemForm />
        </div>
      </div>
    </div>
  );
}

