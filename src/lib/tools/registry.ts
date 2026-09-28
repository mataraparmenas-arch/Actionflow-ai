import { AgentTool } from "./types";
import { createTaskTool, searchTasksTool } from "./task-tools";
import { createReminderTool } from "./reminder-tools";
import { checkAvailabilityTool, createCalendarEventTool } from "./calendar-tools";
import { sendMessageTool } from "./message-tools";
import { searchKnowledgeTool } from "./knowledge-tools";

export class ToolRegistry {
  private static tools: Map<string, AgentTool> = new Map();

  static register(tool: AgentTool) {
    this.tools.set(tool.name, tool);
  }

  static get(name: string): AgentTool | undefined {
    return this.tools.get(name);
  }

  static getAll(): AgentTool[] {
    return Array.from(this.tools.values());
  }

  static getToolMetadata() {
    return this.getAll().map((t) => ({
      name: t.name,
      displayName: t.displayName,
      description: t.description,
      category: t.category,
      permissionLevel: t.permissionLevel,
      schemaDescription: t.schemaDescription,
    }));
  }

  static getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }
}

// Register built-in tools
ToolRegistry.register(createTaskTool);
ToolRegistry.register(searchTasksTool);
ToolRegistry.register(createReminderTool);
ToolRegistry.register(checkAvailabilityTool);
ToolRegistry.register(createCalendarEventTool);
ToolRegistry.register(sendMessageTool);
ToolRegistry.register(searchKnowledgeTool);

export {
  createTaskTool,
  searchTasksTool,
  createReminderTool,
  checkAvailabilityTool,
  createCalendarEventTool,
  sendMessageTool,
  searchKnowledgeTool,
};
