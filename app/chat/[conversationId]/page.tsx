import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/db/profiles";
import { getConversation, getMessages } from "@/lib/db/chat";
import { ChatWindow } from "@/components/chat/ChatWindow";

export default async function ChatConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ conversationId: string }>;
  searchParams: Promise<{ program?: string }>;
}) {
  const { conversationId } = await params;
  const { program } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getProfileByUserId(user.id);
  if (!profile) redirect("/onboarding");

  const conversation = await getConversation(conversationId);
  if (!conversation || conversation.profileId !== profile.id) notFound();

  const messages = await getMessages(conversationId);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-6">
      <ChatWindow
        conversationId={conversationId}
        initialMessages={messages.map((m) => ({ id: m.id, role: m.role, content: m.content }))}
        focusedUniversityProgramId={program}
      />
    </div>
  );
}
