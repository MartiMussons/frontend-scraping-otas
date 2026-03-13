import type { FallbackProps } from "react-error-boundary";

export function AppErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const message = error instanceof Error ? error.message : "Unknown error";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-lg rounded-lg border border-red-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-800">Something went wrong</h1>
        <p className="mt-2 text-sm text-slate-600">The dashboard crashed while rendering.</p>
        <pre className="mt-4 max-h-40 overflow-auto rounded bg-slate-900 p-3 text-xs text-slate-100">{message}</pre>
        <button
          type="button"
          onClick={resetErrorBoundary}
          className="mt-4 rounded bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-900"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
