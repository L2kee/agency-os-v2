// Retry for the "JWT issued at future" race. Right after the middleware
// refreshes a session, the new token's "issued at" time can be a fraction of
// a second ahead of the Data API's clock, so the first query on that page is
// refused. It clears on its own, so one short wait and a second try fixes it.
// Pure, with no server-only imports, so the unit tests can load it.

/** Anything shaped like a PostgREST or Supabase error. */
interface ErrorLike {
  message?: string;
  code?: string;
}

/** True for the token clock skew error, false for every other error. */
export function isClockSkewError(error: ErrorLike | null | undefined): boolean {
  if (!error) return false;
  return /issued at future/i.test(error.message ?? "");
}

/**
 * Runs `attempt` and, if any error it returns is the clock skew error, waits
 * `delayMs` and runs it once more. Any other result, good or bad, comes back
 * from the first try unchanged.
 */
export async function retryOnClockSkew<T>(
  attempt: () => Promise<T>,
  errorsOf: (result: T) => Array<ErrorLike | null | undefined>,
  delayMs = 750,
): Promise<T> {
  const first = await attempt();
  if (!errorsOf(first).some(isClockSkewError)) return first;
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  return attempt();
}
