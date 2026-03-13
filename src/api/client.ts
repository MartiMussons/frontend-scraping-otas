const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined;

if (!API_BASE_URL) {
  throw new Error("Missing VITE_API_BASE_URL. Define it in your .env file.");
}

export async function apiFetch<TResponse>(
  path: string,
  init?: RequestInit,
  errorLabel?: string,
): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);

  if (!response.ok) {
    const fallback = errorLabel ?? `Request failed: ${response.status}`;
    throw new Error(`${fallback}: ${response.status}`);
  }

  return response.json() as Promise<TResponse>;
}
