/**
 * Auth hook that wraps Clerk's useUser and provides a consistent interface
 * for the rest of the app.
 *
 * Also syncs the Clerk user with our backend (creates DB user on first login).
 */
import { useUser, useAuth as useClerkAuth } from "@clerk/clerk-react";
import { trpc } from "@/lib/trpc";

export function useAuth() {
  const { user: clerkUser, isLoaded: clerkLoaded, isSignedIn } = useUser();
  const { signOut } = useClerkAuth();

  // Fetch the DB user via tRPC (this also triggers user creation on first login via context.ts)
  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: clerkLoaded && !!isSignedIn,
    retry: 1,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const loading = !clerkLoaded || (!!isSignedIn && meQuery.isLoading);

  const user = meQuery.data
    ? {
        ...meQuery.data,
        avatarUrl: meQuery.data.avatarUrl || clerkUser?.imageUrl || null,
      }
    : null;

  return {
    user,
    loading,
    error: meQuery.error ?? null,
    isAuthenticated: !!isSignedIn && !!user,
    logout: () => signOut({ redirectUrl: "/" }),
    refresh: () => meQuery.refetch(),
  };
}
