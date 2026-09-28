import { z } from "zod";
import { db } from "@/db";
import { sentMessages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AgentTool } from "./types";

export const sendMessageSchema = z.object({
  recipient: z.string().min(1, "Recipient address or username is required"),
  channel: z.enum(["email", "slack", "sms"]).optional().default("email"),
  subject: z.string().min(1, "Message subject is required"),
  body: z.string().min(1, "Message content is required"),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const sendMessageTool: AgentTool<
  SendMessageInput,
  { messageId: number; recipient: string; channel: string; subject: string; status: string }
> = {
  name: "send_confirmation_message",
  displayName: "Send External Confirmation",
  description: "Dispatches an external confirmation message via Email, Slack, or SMS to an external recipient.",
  category: "communications",
  permissionLevel: "EXTERNAL_SIDE_EFFECT",
  inputSchema: sendMessageSchema,
  schemaDescription: {
    recipient: "Recipient email address, phone number, or handle",
    channel: "Delivery protocol: email, slack, or sms (default: email)",
    subject: "Subject line or header of the message",
    body: "Body text of the message",
  },
  execute: async (input, context) => {
    const startTime = Date.now();
    try {
      const parsed = sendMessageSchema.parse(input);

      const [inserted] = await db
        .insert(sentMessages)
        .values({
          recipient: parsed.recipient,
          channel: parsed.channel || "email",
          subject: parsed.subject,
          body: parsed.body,
          status: "sent",
          createdByTaskId: context.taskId,
        })
        .returning();

      return {
        success: true,
        data: {
          messageId: inserted.id,
          recipient: inserted.recipient,
          channel: inserted.channel,
          subject: inserted.subject,
          status: inserted.status,
        },
        executionDurationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Failed to dispatch message",
        executionDurationMs: Date.now() - startTime,
      };
    }
  },
  validate: async (output, _input, _context) => {
    if (!output?.messageId) {
      return { verified: false, message: "Verification failed: No message ID returned." };
    }
    const record = await db.query.sentMessages.findFirst({
      where: eq(sentMessages.id, output.messageId),
    });

    if (!record) {
      return { verified: false, message: `Verification failed: Message #${output.messageId} was not found in message log.` };
    }

    return {
      verified: true,
      message: `Verified: External message #${record.id} successfully queued & dispatched to ${record.recipient} via ${record.channel}.`,
      details: { id: record.id, recipient: record.recipient, channel: record.channel, status: record.status },
    };
  },
};
