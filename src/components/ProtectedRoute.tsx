// All routes are accessible without authentication.
// Cloud sync is available only to signed-in users (handled by storage.ts).
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

