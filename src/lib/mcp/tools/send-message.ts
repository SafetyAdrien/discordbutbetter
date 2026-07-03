import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}

export default defineTool({
  name: "send_message",
  title: "Send a message to a channel",
  description:
    "Send a text message as the signed-in user to a NexusChat text channel they can post in.",
  inputSchema: {
    channel_id: z.string().uuid().describe("Target channel id."),
    content: z
      .string()
      .trim()
      .min(1)
      .max(4000)
      .describe("Plain-text message content (markdown supported)."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ channel_id, content }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("messages")
      .insert({
        channel_id,
        user_id: ctx.getUserId(),
        content,
      })
      .select("id, channel_id, content, created_at")
      .single();

    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: `Message sent (id: ${data.id})` }],
      structuredContent: { message: data },
    };
  },
});
