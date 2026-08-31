import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/db/profiles";
import { getConversations, createConversation } from "@/lib/db/chat";
import { startNewConversation } from "@/lib/actions/chat";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function ChatIndexPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getProfileByUserId(user.id);
  if (!profile) redirect("/onboarding");

  const conversations = await getConversations(profile.id);

  if (conversations.length === 0) {
    const conversation = await createConversation(profile.id);
    redirect(`/chat/${conversation.id}`);
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Chat with your Admissions Advisor</h1>
        <form action={startNewConversation}>
          <Button type="submit" variant="outline">
            New conversation
          </Button>
        </form>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        {conversations.map((c) => (
          <Link key={c.id} href={`/chat/${c.id}`}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardContent className="py-3">
                <p className="text-sm font-medium">{c.title ?? "Untitled conversation"}</p>
                <p className="text-xs text-muted-foreground">
                  Updated {new Date(c.updatedAt).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
