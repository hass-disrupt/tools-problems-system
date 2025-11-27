export default async function OAuthError({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
        <div className="mb-4">
          <svg
            className="mx-auto h-16 w-16 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Installation Failed
        </h1>
        <p className="text-gray-600 mb-4">
          There was an error installing the Slack app to your workspace.
        </p>
        <p className="text-sm text-gray-500 bg-gray-100 p-3 rounded">
          Error: {params.error || 'Unknown error'}
        </p>
        <p className="text-sm text-gray-500 mt-4">
          Please try installing again or contact support if the issue persists.
        </p>
      </div>
    </div>
  );
}

