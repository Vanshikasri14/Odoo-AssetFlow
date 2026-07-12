import { getCurrentUser } from "@/lib/auth";
import { Header } from "./header";
import { Sidebar } from "./sidebar";

/**
 * Global chrome for the whole app. Renders `children` bare when there's no
 * session (login/signup, before Dev A's auth pages exist) so those routes
 * aren't forced into the authenticated sidebar+header layout.
 */
export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    return <main className="flex flex-1 flex-col">{children}</main>;
  }

  return (
    <div className="flex min-h-screen">
      {/* Desktop nav. Hidden below `lg` — MobileNav (in the header) takes over. */}
      <Sidebar user={user} />

      {/* `min-w-0` is load-bearing: without it a flex child refuses to shrink
          below its content's intrinsic width, so one wide table would push the
          whole layout out and give the page a horizontal scrollbar on mobile. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Header user={user} />
        <main className="flex-1 overflow-y-auto bg-zinc-50 p-4 lg:p-6 dark:bg-black">
          {children}
        </main>
      </div>
    </div>
  );
}
