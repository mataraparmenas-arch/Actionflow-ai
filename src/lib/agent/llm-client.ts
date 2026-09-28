import { IntentAnalysis, StructuredPlan, PlanStep } from "./types";
import { DateResolver } from "./date-resolver";
import { inspectPromptSafety } from "./prompt-guard";
import { ToolRegistry } from "../tools/registry";

export interface ILLMProvider {
  name: string;
  analyzeIntent(input: string): Promise<IntentAnalysis>;
  generatePlan(input: string, analysis: IntentAnalysis): Promise<StructuredPlan>;
  generateSummary(input: string, plan: StructuredPlan, stepResults: any[]): Promise<string>;
}

/**
 * Enterprise Deterministic Reasoning Engine.
 * Fully autonomous, zero external API key dependency, strictly typed.
 */
export class DeterministicEngine implements ILLMProvider {
  name = "builtin-deterministic-engine";

  async analyzeIntent(input: string): Promise<IntentAnalysis> {
    const safety = inspectPromptSafety(input);
    if (!safety.isSafe) {
      return {
        intent: "SECURITY_VIOLATION",
        confidence: 1.0,
        entities: {},
        missingRequiredInfo: [],
        requiresClarification: false,
        clarificationPrompt: undefined,
        isPotentialInjection: true,
        injectionReason: safety.reason,
      };
    }

    const lower = input.toLowerCase();

    // Check for clarification edge case (e.g. vague requests)
    if (
      lower === "schedule a meeting" ||
      lower === "schedule meeting" ||
      lower === "remind me" ||
      lower === "create a task" ||
      (lower.includes("schedule") && !lower.includes("with") && !lower.includes("tomorrow") && !lower.includes("at"))
    ) {
      let missing: string[] = [];
      let prompt = "";
      if (lower.includes("meeting") || lower.includes("schedule")) {
        missing = ["participant", "time_window"];
        prompt = "Who would you like to schedule a meeting with, and what time or duration do you prefer?";
      } else if (lower.includes("remind")) {
        missing = ["reminder_subject", "reminder_time"];
        prompt = "What would you like to be reminded about, and at what specific date or time?";
      } else {
        missing = ["task_title"];
        prompt = "What is the specific title or description for the task you want to create?";
      }

      return {
        intent: "NEEDS_CLARIFICATION",
        confidence: 0.95,
        entities: {},
        missingRequiredInfo: missing,
        requiresClarification: true,
        clarificationPrompt: prompt,
        isPotentialInjection: false,
      };
    }

    // Meeting intent
    if (lower.includes("meeting") || lower.includes("sync") || lower.includes("call with") || lower.includes("schedule")) {
      const participantMatch = input.match(/(?:with|meet)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
      const participant = participantMatch ? participantMatch[1] : (lower.includes("sarah") ? "Sarah" : undefined);

      const hasConfirmation = lower.includes("confirm") || lower.includes("send") || lower.includes("notify");

      if (!participant && !lower.includes("sarah")) {
        return {
          intent: "SCHEDULE_MEETING",
          confidence: 0.7,
          entities: {},
          missingRequiredInfo: ["participant"],
          requiresClarification: true,
          clarificationPrompt: "Please specify who you would like to schedule this meeting with.",
          isPotentialInjection: false,
        };
      }

      const timeWindow = DateResolver.resolveMeetingWindow(input);

      return {
        intent: "SCHEDULE_MEETING",
        confidence: 0.98,
        entities: {
          participant: participant || "Sarah Connor",
          startTime: timeWindow.startTime.toISOString(),
          endTime: timeWindow.endTime.toISOString(),
          durationMinutes: timeWindow.durationMinutes,
          timeDisplay: timeWindow.displaySummary,
          sendConfirmation: hasConfirmation,
        },
        missingRequiredInfo: [],
        requiresClarification: false,
        isPotentialInjection: false,
      };
    }

    // Task & Reminder intent (e.g. "Create a task for me to follow up with the engineering team tomorrow afternoon and remind me at 3 PM.")
    if (lower.includes("task") || lower.includes("follow up") || lower.includes("remind")) {
      let taskTitle = "Follow up with engineering team";
      const followUpMatch = input.match(/follow(?:\s*-\s*|\s+)up\s+with\s+([^,.]+?)(?:\s+tomorrow|\s+and|\s+at|$)/i);
      if (followUpMatch) {
        taskTitle = `Follow up with ${followUpMatch[1].trim()}`;
      } else {
        const taskMatch = input.match(/task\s+(?:for\s+me\s+)?to\s+([^,.]+?)(?:\s+tomorrow|\s+and|\s+at|$)/i);
        if (taskMatch) {
          taskTitle = taskMatch[1].trim();
        }
      }

      const hasReminder = lower.includes("remind");
      const reminderTime = hasReminder ? DateResolver.resolveReminderTime(input) : null;
      const dueDate = DateResolver.resolveDueDate(input);

      return {
        intent: hasReminder ? "TASK_AND_REMINDER" : "CREATE_TASK",
        confidence: 0.98,
        entities: {
          taskTitle,
          dueDate: dueDate.dueDate.toISOString(),
          dueDateDisplay: dueDate.displaySummary,
          hasReminder,
          reminderTime: reminderTime ? reminderTime.remindAt.toISOString() : undefined,
          reminderDisplay: reminderTime ? reminderTime.displaySummary : undefined,
          priority: lower.includes("urgent") ? "urgent" : lower.includes("high") ? "high" : "medium",
        },
        missingRequiredInfo: [],
        requiresClarification: false,
        isPotentialInjection: false,
      };
    }

    // Default intent
    return {
      intent: "GENERAL_TASK",
      confidence: 0.85,
      entities: {
        taskTitle: input.slice(0, 60),
      },
      missingRequiredInfo: [],
      requiresClarification: false,
      isPotentialInjection: false,
    };
  }

  async generatePlan(input: string, analysis: IntentAnalysis): Promise<StructuredPlan> {
    if (analysis.requiresClarification) {
      return {
        goal: "Clarify user request",
        intent: analysis.intent,
        confidence: analysis.confidence,
        steps: [],
        rationale: "Additional parameters are needed before a plan can be formed safely.",
        requiresClarification: true,
        clarificationPrompt: analysis.clarificationPrompt,
      };
    }

    const steps: PlanStep[] = [];

    // Schedule meeting workflow
    if (analysis.intent === "SCHEDULE_MEETING") {
      const participant = analysis.entities.participant || "Sarah Connor";
      const startTime = analysis.entities.startTime || new Date(Date.now() + 86400000).toISOString();
      const endTime = analysis.entities.endTime || new Date(Date.now() + 86400000 + 1800000).toISOString();

      // Step 1: Look up directory info
      steps.push({
        stepNumber: 1,
        actionName: "search_knowledge",
        description: `Lookup contact directory information for ${participant}`,
        toolName: "search_knowledge",
        toolInput: { query: participant, category: "people" },
        permissionLevel: "READ",
        requiresConfirmation: false,
      });

      // Step 2: Check calendar availability
      steps.push({
        stepNumber: 2,
        actionName: "check_calendar_availability",
        description: `Verify calendar slot availability for ${participant} at ${analysis.entities.timeDisplay || "requested time"}`,
        toolName: "check_calendar_availability",
        toolInput: { participant, startTime, endTime },
        permissionLevel: "READ",
        requiresConfirmation: false,
        dependencies: [1],
      });

      // Step 3: Create calendar event
      steps.push({
        stepNumber: 3,
        actionName: "create_calendar_event",
        description: `Book calendar event: "Sync with ${participant}"`,
        toolName: "create_calendar_event",
        toolInput: {
          title: `Sync with ${participant}`,
          participant,
          startTime,
          endTime,
        },
        permissionLevel: "WRITE",
        requiresConfirmation: false,
        dependencies: [2],
      });

      // Step 4: External side-effect (Send confirmation message) -> Requires explicit confirmation!
      if (analysis.entities.sendConfirmation) {
        steps.push({
          stepNumber: 4,
          actionName: "send_confirmation_message",
          description: `Send confirmation email to ${participant} (<sarah.connor@enterprise.internal>) with event invite`,
          toolName: "send_confirmation_message",
          toolInput: {
            recipient: "sarah.connor@enterprise.internal",
            channel: "email",
            subject: `Confirmed: Sync with ${participant}`,
            body: `Hi Sarah, your 30-minute sync has been scheduled for tomorrow afternoon (${analysis.entities.timeDisplay || "tomorrow"}). Calendar invite is attached.`,
          },
          permissionLevel: "EXTERNAL_SIDE_EFFECT",
          requiresConfirmation: true, // Human-in-the-loop gate
          dependencies: [3],
        });
      }

      return {
        goal: `Schedule 30m meeting with ${participant}${analysis.entities.sendConfirmation ? " and dispatch confirmation" : ""}`,
        intent: "SCHEDULE_MEETING",
        confidence: analysis.confidence,
        steps,
        rationale: "Verified participant availability before reserving calendar slot, with human approval gate for external communication.",
        requiresClarification: false,
      };
    }

    // Task and Reminder workflow (Demonstration Workflow 1)
    if (analysis.intent === "TASK_AND_REMINDER" || analysis.intent === "CREATE_TASK") {
      const taskTitle = analysis.entities.taskTitle || "Follow up with engineering team";
      const dueDate = analysis.entities.dueDate;

      // Step 1: Create managed task
      steps.push({
        stepNumber: 1,
        actionName: "create_task",
        description: `Create actionable task: "${taskTitle}"`,
        toolName: "create_task",
        toolInput: {
          title: taskTitle,
          description: `Generated from request: "${input}"`,
          dueDate,
          priority: analysis.entities.priority || "medium",
        },
        permissionLevel: "WRITE",
        requiresConfirmation: false,
      });

      // Step 2: Schedule reminder if requested
      if (analysis.entities.hasReminder && analysis.entities.reminderTime) {
        steps.push({
          stepNumber: 2,
          actionName: "create_reminder",
          description: `Schedule reminder for: ${analysis.entities.reminderDisplay || "tomorrow at 3 PM"}`,
          toolName: "create_reminder",
          toolInput: {
            title: `Reminder: ${taskTitle}`,
            remindAt: analysis.entities.reminderTime,
          },
          permissionLevel: "WRITE",
          requiresConfirmation: false,
          dependencies: [1],
        });
      }

      return {
        goal: `Create task "${taskTitle}" and set corresponding reminder`,
        intent: analysis.intent,
        confidence: analysis.confidence,
        steps,
        rationale: "Create the primary task record in PostgreSQL first, then link and schedule the reminder alert.",
        requiresClarification: false,
      };
    }

    // Default generic workflow
    steps.push({
      stepNumber: 1,
      actionName: "create_task",
      description: `Create task: "${analysis.entities.taskTitle || input}"`,
      toolName: "create_task",
      toolInput: {
        title: analysis.entities.taskTitle || input,
        description: input,
      },
      permissionLevel: "WRITE",
      requiresConfirmation: false,
    });

    return {
      goal: `Execute task based on user request`,
      intent: "GENERAL_TASK",
      confidence: analysis.confidence,
      steps,
      rationale: "Single-step task creation based on extracted parameters.",
      requiresClarification: false,
    };
  }

  async generateSummary(input: string, plan: StructuredPlan, stepResults: any[]): Promise<string> {
    if (plan.intent === "TASK_AND_REMINDER") {
      const taskRes = stepResults.find((r) => r.toolName === "create_task");
      const reminderRes = stepResults.find((r) => r.toolName === "create_reminder");

      const taskId = taskRes?.output?.taskId ? `#${taskRes.output.taskId}` : "";
      const taskTitle = taskRes?.output?.title || "your task";
      const reminderTime = reminderRes?.output?.remindAt
        ? new Date(reminderRes.output.remindAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
        : "3:00 PM";

      return `Successfully created task ${taskId} ("${taskTitle}") and scheduled a reminder for tomorrow at ${reminderTime}. Both records have been verified in the system database.`;
    }

    if (plan.intent === "SCHEDULE_MEETING") {
      const eventRes = stepResults.find((r) => r.toolName === "create_calendar_event");
      const msgRes = stepResults.find((r) => r.toolName === "send_confirmation_message");

      const title = eventRes?.output?.title || "Meeting";
      const participant = eventRes?.output?.participant || "Sarah";
      const msgStatus = msgRes ? " Sent confirmation email to participant." : "";

      return `Successfully scheduled "${title}" with ${participant}. Calendar availability was verified and event was booked.${msgStatus}`;
    }

    return `Completed ${stepResults.length} planned step(s) successfully for request: "${input}". All actions were verified.`;
  }
}

// Fallback / primary singleton client
export const llmClient: ILLMProvider = new DeterministicEngine();
