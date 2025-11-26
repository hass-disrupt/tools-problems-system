import Link from 'next/link';
import ToolCard from '@/components/ToolCard';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface Tool {
  id: string;
  url: string;
  title: string;
  description: string;
  tag: string;
  category: string;
  problem_solves: string;
  who_can_use: string;
  created_at: string;
}

async function getTools() {
  try {
    const supabase = await createClient();
    const { data: tools, error } = await supabase
      .from('tools')
      .select('id, url, title, description, tag, category, problem_solves, who_can_use, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tools:', error);
      return [];
    }

    return (tools || []) as Tool[];
  } catch (error) {
    console.error('Error fetching tools:', error);
    return [];
  }
}

export default async function ToolsPage() {
  const tools = await getTools();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link
            href="/"
            className="text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block"
          >
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mt-4">
            All Tools
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2">
            Browse all available tools and their capabilities.
          </p>
        </div>

        {/* Tools Grid */}
        {tools.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-12 text-center">
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              No tools available yet.
            </p>
            <Link
              href="/add-tool"
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Add a Tool
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

