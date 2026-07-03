import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listMyServersTool from "./tools/list-my-servers";
import listChannelsTool from "./tools/list-channels";
import sendMessageTool from "./tools/send-message";

const projectRef =
  import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "nexuschat-mcp",
  title: "NexusChat MCP",
  version: "0.1.0",
  instructions:
    "Tools for NexusChat. Use `list_my_servers` to find servers the user belongs to, `list_channels` to browse a server's channels, and `send_message` to post as the signed-in user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listMyServersTool, listChannelsTool, sendMessageTool],
});
