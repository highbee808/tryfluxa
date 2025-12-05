const rawBaseUrl =
  import.meta.env.VITE_SUPABASE_FUNCTIONS_URL ||
  (import.meta.env.VITE_SUPABASE_URL
    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
    : undefined);

const rawAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const FUNCTIONS_BASE_URL = rawBaseUrl
  ? rawBaseUrl.replace(/\/$/, "")
  : undefined;

export const FUNCTIONS_ANON_KEY = rawAnonKey?.trim() || undefined;

export const buildFunctionUrl = (
  functionName: string,
  searchParams: Record<string, string | number | undefined> = {}
) => {
  if (!FUNCTIONS_BASE_URL) {
    throw new Error(
      "Missing VITE_SUPABASE_FUNCTIONS_URL (or VITE_SUPABASE_URL fallback) for edge functions"
    );
  }

  const cleanName = functionName.replace(/^\//, "");
  const url = new URL(`${FUNCTIONS_BASE_URL}/${cleanName}`);

  Object.entries(searchParams).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    url.searchParams.set(key, String(value));
  });

  return url.toString();
};

export const functionAuthHeaders = () => {
  if (!FUNCTIONS_ANON_KEY) {
    throw new Error("Missing VITE_SUPABASE_ANON_KEY for edge functions");
  }

  return {
    Authorization: `Bearer ${FUNCTIONS_ANON_KEY}`,
    apikey: FUNCTIONS_ANON_KEY,
  };
};
