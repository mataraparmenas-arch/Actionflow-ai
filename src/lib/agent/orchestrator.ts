import { db } from "@/db";
import { tasks, taskSteps, toolExecutions, auditLogs } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { llmClient } from "./llm-client";
import { ToolRegistry } from "../tools/registry";
import { inspectPromptSafety } from "./prompt-guard";
import { AgentRunResult, ExecutionTraceItem } from "./types";

const MAX_EXECUTION_STEPS = 10;
const MAX_STEP_RETRIES = 2;

export class AgentOrchestrator {
  /**
   * Initializes and starts a new agent task from natural language input.
   */
  static async submitTask(rawInput: string, userId = "user_demo"): Promise<AgentRunResult> {
    const traces: ExecutionTraceItem[] = [];

    // Step 0: Security & Injection Check
    const safetyCheck = inspectPromptSafety(rawInput);
    if (!safetyCheck.isSafe) {
      const [failedTask] = await db
        .insert(tasks)
        .values({
          userId,
          rawInput,
          intent: "SECURITY_VIOLATION",
          status: "EXECUTION_FAILED",
          errorMessage: `Security violation detected: ${safetyCheck.reason}`,
          userResponse: `Request rejected: ${safetyCheck.reason} System security policies prohibit this action.`,
        })
        .returning();

      await db.insert(auditLogs).values({
        taskId: failedTask.id,
        actor: "SYSTEM",
        action: "SECURITY_BLOCKED",
        details: { threat: safetyCheck.threatType, reason: safetyCheck.reason },
      });

      return {
        taskId: failedTask.id,
        status: "EXECUTION_FAILED",
        userResponse: failedTask.userResponse || "Execution blocked by security policy.",
        stepsCompleted: 0,
        totalSteps: 0,
        traces: [
          {
            id: "trace_sec_1",
            timestamp: new Date().toISOString(),
            stage: "SECURITY_INSPECTION",
            message: `Threat detected: ${safetyCheck.threatType} - ${safetyCheck.reason}`,
            status: "error",
          },
        ],
      };
    }

    traces.push({
      id: "trace_1",
      timestamp: new Date().toISOString(),
      stage: "INPUT_ANALYSIS",
      message: "Understanding intent and extracting parameters from natural language request.",
      status: "info",
    });

    // Step 1: Intent Analysis
    const intentAnalysis = await llmClient.analyzeIntent(safetyCheck.sanitizedInput);

    // If clarification needed -> Pause in WAITING_FOR_INPUT
    if (intentAnalysis.requiresClarification) {
      const [waitingTask] = await db
        .insert(tasks)
        .values({
          userId,
          rawInput: safetyCheck.sanitizedInput,
          intent: intentAnalysis.intent,
          status: "WAITING_FOR_INPUT",
          clarificationPrompt: intentAnalysis.clarificationPrompt,
          userResponse: intentAnalysis.clarificationPrompt,
          metadata: {
            requiresClarification: true,
            confidenceScore: intentAnalysis.confidence,
          },
        })
        .returning();

      await db.insert(auditLogs).values({
        taskId: waitingTask.id,
        actor: "AI_AGENT",
        action: "CLARIFICATION_REQUESTED",
        details: {
          missingRequiredInfo: intentAnalysis.missingRequiredInfo,
          prompt: intentAnalysis.clarificationPrompt,
        },
      });

      traces.push({
        id: "trace_clarify",
        timestamp: new Date().toISOString(),
        stage: "CLARIFICATION_CHECK",
        message: `Missing required parameters: ${intentAnalysis.missingRequiredInfo.join(", ")}. Clarification needed from user.`,
        status: "warning",
      });

      return {
        taskId: waitingTask.id,
        status: "WAITING_FOR_INPUT",
        userResponse: intentAnalysis.clarificationPrompt || "Please provide additional details.",
        stepsCompleted: 0,
        totalSteps: 0,
        traces,
        requiresAction: {
          type: "CLARIFICATION",
          prompt: intentAnalysis.clarificationPrompt || "Please clarify your request.",
        },
      };
    }

    // Step 2: Create initial task record
    const [taskRecord] = await db
      .insert(tasks)
      .values({
        userId,
        rawInput: safetyCheck.sanitizedInput,
        intent: intentAnalysis.intent,
        status: "PLANNING",
        metadata: {
          confidenceScore: intentAnalysis.confidence,
        },
      })
      .returning();

    await db.insert(auditLogs).values({
      taskId: taskRecord.id,
      actor: "AI_AGENT",
      action: "INTENT_IDENTIFIED",
      details: { intent: intentAnalysis.intent, entities: intentAnalysis.entities },
    });

    traces.push({
      id: "trace_2",
      timestamp: new Date().toISOString(),
      stage: "PLANNING",
      message: `Intent identified as "${intentAnalysis.intent}". Constructing structured execution plan.`,
      status: "info",
    });

    // Step 3: Generate Structured Plan
    const plan = await llmClient.generatePlan(safetyCheck.sanitizedInput, intentAnalysis);

    await db
      .update(tasks)
      .set({
        structuredPlan: plan,
        status: "EXECUTING",
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, taskRecord.id));

    await db.insert(auditLogs).values({
      taskId: taskRecord.id,
      actor: "AI_AGENT",
      action: "PLAN_CREATED",
      details: { stepCount: plan.steps.length, rationale: plan.rationale },
    });

    // Step 4: Insert task steps
    for (const step of plan.steps) {
      await db.insert(taskSteps).values({
        taskId: taskRecord.id,
        stepNumber: step.stepNumber,
        actionName: step.actionName,
        description: step.description,
        status: "PENDING",
        toolName: step.toolName,
        permissionLevel: step.permissionLevel,
        requiresConfirmation: step.requiresConfirmation,
        confirmationStatus: step.requiresConfirmation ? "PENDING" : "NONE",
        toolInput: step.toolInput,
      });
    }

    // Step 5: Execute steps via execution loop
    return await this.executeTask(taskRecord.id, traces);
  }

  /**
   * Core Execution Engine: drives steps through PENDING -> EXECUTING -> VERIFYING -> COMPLETED
   */
  static async executeTask(taskId: number, existingTraces: ExecutionTraceItem[] = []): Promise<AgentRunResult> {
    const traces = [...existingTraces];

    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
    });

    if (!task) {
      throw new Error(`Task #${taskId} not found.`);
    }

    // Fetch ordered steps
    const steps = await db.query.taskSteps.findMany({
      where: eq(taskSteps.taskId, taskId),
      orderBy: [asc(taskSteps.stepNumber)],
    });

    if (steps.length === 0) {
      await db
        .update(tasks)
        .set({ status: "COMPLETED", userResponse: "Task had no executable steps.", completedAt: new Date() })
        .where(eq(tasks.id, taskId));

      return {
        taskId,
        status: "COMPLETED",
        userResponse: "Task had no executable steps.",
        stepsCompleted: 0,
        totalSteps: 0,
        traces,
      };
    }

    let completedCount = 0;
    const executedResults: any[] = [];

    // Loop through steps with safety limit
    for (let i = 0; i < steps.length && i < MAX_EXECUTION_STEPS; i++) {
      const step = steps[i];

      if (step.status === "COMPLETED") {
        completedCount++;
        executedResults.push({ toolName: step.toolName, output: step.toolOutput });
        continue;
      }

      // Check Human-in-the-Loop Confirmation Gate
      if (step.requiresConfirmation && step.confirmationStatus !== "APPROVED") {
        if (step.confirmationStatus === "REJECTED") {
          // User rejected this action
          await db
            .update(taskSteps)
            .set({ status: "SKIPPED", updatedAt: new Date() })
            .where(eq(taskSteps.id, step.id));

          traces.push({
            id: `trace_reject_${step.id}`,
            timestamp: new Date().toISOString(),
            stage: "CONFIRMATION_REJECTED",
            message: `User rejected action: "${step.description}". Step skipped.`,
            status: "warning",
          });
          continue;
        }

        // Action is waiting for human confirmation
        await db
          .update(taskSteps)
          .set({ status: "WAITING_FOR_CONFIRMATION", updatedAt: new Date() })
          .where(eq(taskSteps.id, step.id));

        await db
          .update(tasks)
          .set({
            status: "WAITING_FOR_CONFIRMATION",
            userResponse: `Step requires confirmation before proceeding: ${step.description}`,
            updatedAt: new Date(),
          })
          .where(eq(tasks.id, taskId));

        await db.insert(auditLogs).values({
          taskId,
          actor: "AI_AGENT",
          action: "CONFIRMATION_REQUIRED",
          details: {
            stepId: step.id,
            actionName: step.actionName,
            description: step.description,
            permissionLevel: step.permissionLevel,
            payload: step.toolInput,
          },
        });

        traces.push({
          id: `trace_wait_confirm_${step.id}`,
          timestamp: new Date().toISOString(),
          stage: "HUMAN_APPROVAL_REQUIRED",
          message: `Sensitive action (${step.permissionLevel}) requires user confirmation: "${step.description}"`,
          status: "warning",
        });

        return {
          taskId,
          status: "WAITING_FOR_CONFIRMATION",
          userResponse: `Approval required for step ${step.stepNumber}: ${step.description}`,
          stepsCompleted: completedCount,
          totalSteps: steps.length,
          traces,
          requiresAction: {
            type: "CONFIRMATION",
            stepId: step.id,
            prompt: `Do you want to proceed with: "${step.description}"?`,
            payload: step.toolInput,
          },
        };
      }

      // Find tool in registry
      const tool = ToolRegistry.get(step.toolName);
      if (!tool) {
        const errorMsg = `Tool "${step.toolName}" is not registered in ToolRegistry.`;
        await db
          .update(taskSteps)
          .set({ status: "FAILED", errorMessage: errorMsg, updatedAt: new Date() })
          .where(eq(taskSteps.id, step.id));

        await db
          .update(tasks)
          .set({ status: "EXECUTION_FAILED", errorMessage: errorMsg, updatedAt: new Date() })
          .where(eq(tasks.id, taskId));

        return {
          taskId,
          status: "EXECUTION_FAILED",
          userResponse: `Execution failed: ${errorMsg}`,
          stepsCompleted: completedCount,
          totalSteps: steps.length,
          traces,
        };
      }

      // Execute tool with retry logic
      await db
        .update(taskSteps)
        .set({ status: "EXECUTING", updatedAt: new Date() })
        .where(eq(taskSteps.id, step.id));

      traces.push({
        id: `trace_exec_${step.id}`,
        timestamp: new Date().toISOString(),
        stage: "EXECUTING",
        message: `Invoking tool [${tool.name}]: ${step.description}`,
        status: "info",
      });

      let toolResult = null;
      let attempt = 0;
      let lastError = "";

      while (attempt <= MAX_STEP_RETRIES) {
        attempt++;
        const idempotencyKey = `task_${taskId}_step_${step.id}_try_${attempt}`;

        toolResult = await tool.execute(step.toolInput, {
          taskId,
          stepId: step.id,
          idempotencyKey,
        });

        // Record immutable tool execution
        await db.insert(toolExecutions).values({
          taskId,
          stepId: step.id,
          toolName: tool.name,
          permissionLevel: tool.permissionLevel,
          inputPayload: step.toolInput,
          outputPayload: toolResult.data || null,
          idempotencyKey,
          status: toolResult.success ? "SUCCESS" : "FAILED",
          executionDurationMs: toolResult.executionDurationMs || 0,
          errorMessage: toolResult.error || null,
        });

        if (toolResult.success) {
          break;
        }

        lastError = toolResult.error || "Unknown tool failure";
        if (attempt <= MAX_STEP_RETRIES) {
          traces.push({
            id: `trace_retry_${step.id}_${attempt}`,
            timestamp: new Date().toISOString(),
            stage: "TOOL_RETRY",
            message: `Tool execution failed (${lastError}). Retrying attempt ${attempt}/${MAX_STEP_RETRIES}...`,
            status: "warning",
          });
          await db
            .update(taskSteps)
            .set({ retryCount: attempt, errorMessage: lastError, updatedAt: new Date() })
            .where(eq(taskSteps.id, step.id));
        }
      }

      if (!toolResult || !toolResult.success) {
        const failureMsg = `Tool [${tool.name}] failed after ${attempt} attempts: ${lastError}`;
        await db
          .update(taskSteps)
          .set({ status: "FAILED", errorMessage: failureMsg, updatedAt: new Date() })
          .where(eq(taskSteps.id, step.id));

        await db
          .update(tasks)
          .set({ status: "EXECUTION_FAILED", errorMessage: failureMsg, updatedAt: new Date() })
          .where(eq(tasks.id, taskId));

        traces.push({
          id: `trace_fail_${step.id}`,
          timestamp: new Date().toISOString(),
          stage: "STEP_FAILED",
          message: failureMsg,
          status: "error",
        });

        return {
          taskId,
          status: "EXECUTION_FAILED",
          userResponse: failureMsg,
          stepsCompleted: completedCount,
          totalSteps: steps.length,
          traces,
        };
      }

      // Step Verification Phase
      await db
        .update(taskSteps)
        .set({ status: "VERIFYING", toolOutput: toolResult.data, updatedAt: new Date() })
        .where(eq(taskSteps.id, step.id));

      traces.push({
        id: `trace_verify_${step.id}`,
        timestamp: new Date().toISOString(),
        stage: "VERIFYING",
        message: `Verifying outcome of [${tool.name}] against database records...`,
        status: "info",
      });

      const verification = await tool.validate(toolResult.data, step.toolInput, {
        taskId,
        stepId: step.id,
        idempotencyKey: `verify_task_${taskId}_step_${step.id}`,
      });

      if (!verification.verified) {
        const verifyError = `Verification failed for step ${step.stepNumber}: ${verification.message}`;
        await db
          .update(taskSteps)
          .set({ status: "FAILED", errorMessage: verifyError, verificationResult: verification, updatedAt: new Date() })
          .where(eq(taskSteps.id, step.id));

        await db
          .update(tasks)
          .set({ status: "VALIDATION_FAILED", errorMessage: verifyError, updatedAt: new Date() })
          .where(eq(tasks.id, taskId));

        traces.push({
          id: `trace_verify_fail_${step.id}`,
          timestamp: new Date().toISOString(),
          stage: "VALIDATION_FAILED",
          message: verifyError,
          status: "error",
        });

        return {
          taskId,
          status: "VALIDATION_FAILED",
          userResponse: verifyError,
          stepsCompleted: completedCount,
          totalSteps: steps.length,
          traces,
        };
      }

      // Step Succeeded and Verified
      await db
        .update(taskSteps)
        .set({
          status: "COMPLETED",
          verificationResult: verification,
          updatedAt: new Date(),
        })
        .where(eq(taskSteps.id, step.id));

      await db.insert(auditLogs).values({
        taskId,
        actor: "AI_AGENT",
        action: "STEP_VERIFIED",
        details: { stepId: step.id, toolName: tool.name, verificationMessage: verification.message },
      });

      traces.push({
        id: `trace_step_ok_${step.id}`,
        timestamp: new Date().toISOString(),
        stage: "STEP_COMPLETED",
        message: verification.message,
        status: "success",
      });

      completedCount++;
      executedResults.push({ toolName: step.toolName, output: toolResult.data });
    }

    // Step 6: All steps successfully executed & verified
    const summary = await llmClient.generateSummary(
      task.rawInput,
      (task.structuredPlan as any) || { steps: [] },
      executedResults
    );

    await db
      .update(tasks)
      .set({
        status: "COMPLETED",
        userResponse: summary,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, taskId));

    await db.insert(auditLogs).values({
      taskId,
      actor: "AI_AGENT",
      action: "TASK_COMPLETED",
      details: { summary, stepsCompleted: completedCount },
    });

    traces.push({
      id: "trace_final",
      timestamp: new Date().toISOString(),
      stage: "COMPLETED",
      message: "All planned operations executed and database records verified.",
      status: "success",
    });

    return {
      taskId,
      status: "COMPLETED",
      userResponse: summary,
      stepsCompleted: completedCount,
      totalSteps: steps.length,
      traces,
    };
  }

  /**
   * Responds to human-in-the-loop confirmation.
   */
  static async resolveConfirmation(taskId: number, stepId: number, approved: boolean): Promise<AgentRunResult> {
    const step = await db.query.taskSteps.findFirst({
      where: eq(taskSteps.id, stepId),
    });

    if (!step) {
      throw new Error(`Step #${stepId} not found.`);
    }

    await db
      .update(taskSteps)
      .set({
        confirmationStatus: approved ? "APPROVED" : "REJECTED",
        updatedAt: new Date(),
      })
      .where(eq(taskSteps.id, stepId));

    await db.insert(auditLogs).values({
      taskId,
      actor: "USER",
      action: approved ? "CONFIRMATION_GRANTED" : "CONFIRMATION_DENIED",
      details: { stepId, actionName: step.actionName },
    });

    // Resume execution
    return await this.executeTask(taskId, [
      {
        id: `trace_confirm_${Date.now()}`,
        timestamp: new Date().toISOString(),
        stage: "HUMAN_APPROVAL_RECEIVED",
        message: approved ? `User granted approval for "${step.description}".` : `User rejected "${step.description}".`,
        status: approved ? "success" : "warning",
      },
    ]);
  }

  /**
   * Responds to clarification question.
   */
  static async provideClarification(taskId: number, clarificationText: string): Promise<AgentRunResult> {
    const existing = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
    });

    if (!existing) {
      throw new Error(`Task #${taskId} not found.`);
    }

    const mergedInput = `${existing.rawInput}. Clarification: ${clarificationText}`;

    await db.insert(auditLogs).values({
      taskId,
      actor: "USER",
      action: "CLARIFICATION_PROVIDED",
      details: { original: existing.rawInput, clarification: clarificationText },
    });

    // Re-submit with merged context
    return await this.submitTask(mergedInput, existing.userId);
  }
}
