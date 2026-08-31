import { createClient } from "@/lib/supabase/server";

export interface ChatConversation {
  id: string;
  profileId: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

export async function createConversation(profileId: string, title?: string): Promise<ChatConversation> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chat_conversations")
    .insert({ profile_id: profileId, title: title ?? null })
    .select("*")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    profileId: data.profile_id,
    title: data.title,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function getConversations(profileId: string): Promise<ChatConversation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chat_conversations")
    .select("*")
    .eq("profile_id", profileId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    profileId: row.profile_id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function getConversation(conversationId: string): Promise<ChatConversation | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("chat_conversations").select("*").eq("id", conversationId).maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    profileId: data.profile_id,
    title: data.title,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function getMessages(conversationId: string): Promise<ChatMessage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  }));
}

export async function saveMessage(
  conversationId: string,
  role: "user" | "assistant" | "system",
  content: string
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("chat_messages").insert({
    conversation_id: conversationId,
    role,
    content,
  });
  if (error) throw error;
  await supabase
    .from("chat_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);
}
