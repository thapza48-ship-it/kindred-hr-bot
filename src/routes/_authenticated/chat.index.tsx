import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/chat/")({
  component: () => null,
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/auth" });

    const { data: existing } = await supabase
      .from("chat_threads")
      .select("id")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      throw redirect({ to: "/chat/$threadId", params: { threadId: existing.id } });
    }

    const { data: created, error } = await supabase
      .from("chat_threads")
      .insert({ user_id: u.user.id, title: "New conversation" })
      .select("id")
      .single();
    if (error) throw error;
    throw redirect({ to: "/chat/$threadId", params: { threadId: created.id } });
  },
});
