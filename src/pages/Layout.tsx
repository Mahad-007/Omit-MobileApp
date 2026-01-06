import { Outlet, Link } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";

export default function Layout() {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
        <footer className="border-t py-4 px-6 text-center text-sm text-muted-foreground">
          <Link to="/privacy" className="hover:text-primary hover:underline">
            Privacy Policy
          </Link>
          <span className="mx-2">·</span>
          <Link to="/terms" className="hover:text-primary hover:underline">
            Terms of Service
          </Link>
        </footer>
      </div>
    </div>
  );
}
