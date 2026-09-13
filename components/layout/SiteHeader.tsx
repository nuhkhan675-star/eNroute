import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase/currentUser";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/Logo";
import { AccountMenu } from "@/components/layout/AccountMenu";
import { PrimaryNav } from "@/components/layout/PrimaryNav";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      {/* Three columns with the outer two sharing the slack, so the nav sits
          on the true centre line of the page rather than wherever the logo
          and account menu happen to leave it. */}
      <div className="mx-auto grid h-16 w-full max-w-6xl grid-cols-[1fr_auto_1fr] items-center px-6">
        <Link href="/" className="justify-self-start transition-opacity hover:opacity-80">
          <Logo className="h-10" />
        </Link>

        {user ? <PrimaryNav /> : <span />}

        <div className="flex items-center justify-self-end">
          {user ? (
            <AccountMenu
              name={String(user.user_metadata?.full_name ?? "")}
              email={user.email ?? ""}
            />
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/login">Log in</Link>} />
              <Button
                size="sm"
                className="shadow-[0_0_16px_-4px_var(--primary)]"
                nativeButton={false}
                render={<Link href="/signup">Sign up</Link>}
              />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
