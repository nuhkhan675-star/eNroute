import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/actions/auth";
import { Logo } from "@/components/layout/Logo";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <Link href="/" className="transition-opacity hover:opacity-80">
          <Logo className="text-xl" />
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/universities" className="text-muted-foreground transition-colors hover:text-foreground">
            Universities
          </Link>
          {user ? (
            <>
              <Link href="/dashboard" className="text-muted-foreground transition-colors hover:text-foreground">
                Dashboard
              </Link>
              <Link href="/chat" className="text-muted-foreground transition-colors hover:text-foreground">
                Advisor Chat
              </Link>
              <form action={signOut}>
                <Button type="submit" variant="ghost" size="sm">
                  Log out
                </Button>
              </form>
            </>
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
        </nav>
      </div>
    </header>
  );
}
