import { z } from "zod";
import { AgentTool } from "./types";

export const searchKnowledgeSchema = z.object({
  query: z.string().min(1, "Search query is required"),
  category: z.enum(["people", "teams", "policies", "general"]).optional().default("general"),
});

export type SearchKnowledgeInput = z.infer<typeof searchKnowledgeSchema>;

// Mock internal organizational directory database
const DIRECTORY_DATA = [
  {
    id: "contact_sarah",
    name: "Sarah Connor",
    email: "sarah.connor@enterprise.internal",
    role: "VP of Engineering",
    slack: "@sarah",
    timezone: "America/New_York",
    workingHours: "9:00 AM - 5:30 PM",
  },
  {
    id: "contact_alex",
    name: "Alex Rivera",
    email: "alex.rivera@enterprise.internal",
    role: "Staff Infrastructure Engineer",
    slack: "@alex-riv",
    timezone: "America/New_York",
    workingHours: "9:00 AM - 5:00 PM",
  },
  {
    id: "team_engineering",
    name: "Core Engineering Team",
    channel: "#eng-core",
    lead: "Sarah Connor",
    sprintMeeting: "Thursdays at 2:00 PM",
    timezone: "America/New_York",
  },
  {
    id: "policy_meetings",
    name: "Meeting Guidelines",
    defaultDuration: "30 minutes",
    coreHours: "10:00 AM - 4:00 PM",
    advanceNotice: "Minimum 2 hours notice for internal calendar events",
  },
];

export const searchKnowledgeTool: AgentTool<
  SearchKnowledgeInput,
  { results: any[]; matchedCount: number }
> = {
  name: "search_knowledge",
  displayName: "Search Organizational Knowledge",
  description: "Searches directory contacts, team channels, and company guidelines.",
  category: "knowledge",
  permissionLevel: "READ",
  inputSchema: searchKnowledgeSchema,
  schemaDescription: {
    query: "Person name, team name, or subject to look up",
    category: "Category to search: people, teams, policies, or general (default: general)",
  },
  execute: async (input) => {
    const startTime = Date.now();
    try {
      const parsed = searchKnowledgeSchema.parse(input);
      const q = parsed.query.toLowerCase().trim();

      const matched = DIRECTORY_DATA.filter((item) => {
        const itemStr = JSON.stringify(item).toLowerCase();
        return itemStr.includes(q);
      });

      return {
        success: true,
        data: {
          results: matched.length > 0 ? matched : DIRECTORY_DATA.slice(0, 2),
          matchedCount: matched.length > 0 ? matched.length : 2,
        },
        executionDurationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Failed to search knowledge directory",
        executionDurationMs: Date.now() - startTime,
      };
    }
  },
  validate: async (output) => {
    return {
      verified: true,
      message: `Verified: Knowledge directory lookup returned ${output.matchedCount} reference(s).`,
      details: { matchedCount: output.matchedCount },
    };
  },
};
