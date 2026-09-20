import { BottomNav } from "@/components/dashboard/bottom-nav";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { SidebarNav } from "@/components/dashboard/sidebar";
import { UserMenu } from "@/components/dashboard/user-menu";
import { PageTransition } from "@/components/motion/page-transition";
import { getCurrentUser } from "@/lib/dal";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // getCurrentUser() verifies the session and redirects to /login if absent.
  // This is for the shell's own data - each page re-checks through the DAL,
  // because a layout does not re-render on navigation between its children.
  const user = await getCurrentUser();

  return (
    <div className="relative flex min-h-svh">
      {/* A wash of brand colour behind the top of the page, so the frosted bar
          has something to sit on rather than flat white. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-80 bg-linear-to-b from-brand/8 via-brand/2 to-transparent"
      />

      <aside className="glass-sidebar hidden w-64 shrink-0 border-r lg:block">
        <div className="sticky top-0 h-svh">
          <SidebarNav role={user.role} orgName={user.org.name} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass sticky top-0 z-20 flex h-14 items-center gap-2 border-b px-4">
          <MobileNav role={user.role} orgName={user.org.name} />
          <div className="flex-1" />
          <UserMenu
            name={user.name}
            email={user.email}
            image={user.image}
            role={user.role}
          />
        </header>

        {/* The extra bottom padding clears the mobile bar; on lg the bar is
            gone and the padding goes back to normal. */}
        <main className="flex-1 p-4 pb-24 lg:p-6">
          <PageTransition>{children}</PageTransition>
        </main>

        <BottomNav role={user.role} />
      </div>
    </div>
  );
}
