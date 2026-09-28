export interface ResolvedTimeWindow {
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  displaySummary: string;
}

export interface ResolvedReminder {
  remindAt: Date;
  displaySummary: string;
}

/**
 * Resolves natural language date and time expressions relative to referenceDate.
 */
export class DateResolver {
  static getBaseDate(referenceDate?: Date): Date {
    return referenceDate ? new Date(referenceDate) : new Date();
  }

  static resolveReminderTime(text: string, referenceDate?: Date): ResolvedReminder {
    const base = this.getBaseDate(referenceDate);
    const lower = text.toLowerCase();

    // Default target date is tomorrow if text contains "tomorrow", else today
    const targetDate = new Date(base);
    if (lower.includes("tomorrow")) {
      targetDate.setDate(targetDate.getDate() + 1);
    } else if (lower.includes("next week")) {
      targetDate.setDate(targetDate.getDate() + 7);
    }

    // Check for specific hour patterns like "at 3 PM", "3pm", "3:30 pm", "15:00"
    const timeMatch = lower.match(/(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);

    let hour = 15; // default 3 PM
    let minute = 0;

    // Check specifically for "3 pm" or "3pm" or "15:00"
    const specificTimeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
    if (specificTimeMatch) {
      let h = parseInt(specificTimeMatch[1], 10);
      const m = specificTimeMatch[2] ? parseInt(specificTimeMatch[2], 10) : 0;
      const meridiem = specificTimeMatch[3].toLowerCase();

      if (meridiem === "pm" && h < 12) h += 12;
      if (meridiem === "am" && h === 12) h = 0;
      hour = h;
      minute = m;
    } else if (lower.includes("afternoon")) {
      hour = 14; // 2:00 PM
    } else if (lower.includes("morning")) {
      hour = 9; // 9:00 AM
    } else if (lower.includes("evening")) {
      hour = 18; // 6:00 PM
    } else if (timeMatch && timeMatch[3]) {
      let h = parseInt(timeMatch[1], 10);
      const m = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      if (timeMatch[3].toLowerCase() === "pm" && h < 12) h += 12;
      if (timeMatch[3].toLowerCase() === "am" && h === 12) h = 0;
      hour = h;
      minute = m;
    }

    targetDate.setHours(hour, minute, 0, 0);

    const formattedTime = targetDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const formattedDate = targetDate.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });

    return {
      remindAt: targetDate,
      displaySummary: `${formattedDate} at ${formattedTime}`,
    };
  }

  static resolveMeetingWindow(text: string, referenceDate?: Date): ResolvedTimeWindow {
    const base = this.getBaseDate(referenceDate);
    const lower = text.toLowerCase();

    const targetDate = new Date(base);
    if (lower.includes("tomorrow")) {
      targetDate.setDate(targetDate.getDate() + 1);
    } else if (lower.includes("day after tomorrow")) {
      targetDate.setDate(targetDate.getDate() + 2);
    }

    // Default duration
    let durationMinutes = 30;
    const durationMatch = lower.match(/(\d+)\s*(?:min|minute|hr|hour)s?/i);
    if (durationMatch) {
      const val = parseInt(durationMatch[1], 10);
      if (lower.includes("hour") || lower.includes("hr")) {
        durationMinutes = val * 60;
      } else {
        durationMinutes = val;
      }
    }

    // Determine start hour: default afternoon is 2:00 PM (14:00)
    let startHour = 14;
    let startMinute = 0;

    const specificTime = lower.match(/(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
    if (specificTime) {
      let h = parseInt(specificTime[1], 10);
      const m = specificTime[2] ? parseInt(specificTime[2], 10) : 0;
      const meridiem = specificTime[3].toLowerCase();
      if (meridiem === "pm" && h < 12) h += 12;
      if (meridiem === "am" && h === 12) h = 0;
      startHour = h;
      startMinute = m;
    } else if (lower.includes("afternoon")) {
      startHour = 14; // 2:00 PM
    } else if (lower.includes("morning")) {
      startHour = 10; // 10:00 AM
    } else if (lower.includes("evening")) {
      startHour = 17; // 5:00 PM
    }

    const startTime = new Date(targetDate);
    startTime.setHours(startHour, startMinute, 0, 0);

    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

    const dateStr = startTime.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
    const startStr = startTime.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const endStr = endTime.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

    return {
      startTime,
      endTime,
      durationMinutes,
      displaySummary: `${dateStr}, ${startStr} – ${endStr} (${durationMinutes} mins)`,
    };
  }

  static resolveDueDate(text: string, referenceDate?: Date): { dueDate: Date; displaySummary: string } {
    const base = this.getBaseDate(referenceDate);
    const lower = text.toLowerCase();
    const target = new Date(base);

    if (lower.includes("tomorrow")) {
      target.setDate(target.getDate() + 1);
    } else if (lower.includes("end of week") || lower.includes("friday")) {
      const day = target.getDay();
      const diff = 5 - day;
      target.setDate(target.getDate() + (diff > 0 ? diff : 7 + diff));
    } else if (lower.includes("next week")) {
      target.setDate(target.getDate() + 7);
    }

    if (lower.includes("afternoon")) {
      target.setHours(17, 0, 0, 0); // End of afternoon 5 PM
    } else if (lower.includes("morning")) {
      target.setHours(12, 0, 0, 0);
    } else {
      target.setHours(17, 0, 0, 0);
    }

    return {
      dueDate: target,
      displaySummary: target.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }),
    };
  }
}
