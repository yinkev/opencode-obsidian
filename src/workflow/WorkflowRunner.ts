import { App, TFile } from "obsidian";
import { OpenCodeClient } from "../opencode";
import { ContextInjector, ContextSnapshot } from "../context";
import { WorkflowGraph, WorkflowNode } from "./CanvasTypes";

export type WorkflowStatus = "idle" | "running" | "completed" | "failed" | "cancelled";

export interface WorkflowProgress {
  status: WorkflowStatus;
  currentNodeId: string | null;
  completedNodes: string[];
  failedNodes: string[];
  totalNodes: number;
}

export type ProgressHandler = (progress: WorkflowProgress) => void;

const WORKFLOW_HEADER = "[WORKFLOW v1]";

export class WorkflowRunner {
  private app: App;
  private client: OpenCodeClient;
  private contextInjector: ContextInjector;
  private status: WorkflowStatus = "idle";
  private currentNodeId: string | null = null;
  private completedNodes: Set<string> = new Set();
  private failedNodes: Set<string> = new Set();
  private progressHandlers: Set<ProgressHandler> = new Set();
  private abortController: AbortController | null = null;

  constructor(app: App, client: OpenCodeClient, contextInjector: ContextInjector) {
    this.app = app;
    this.client = client;
    this.contextInjector = contextInjector;
  }

  getStatus(): WorkflowStatus {
    return this.status;
  }

  onProgress(handler: ProgressHandler): () => void {
    this.progressHandlers.add(handler);
    return () => this.progressHandlers.delete(handler);
  }

  async run(
    sessionId: string,
    graph: WorkflowGraph,
    context: ContextSnapshot
  ): Promise<boolean> {
    if (this.status === "running") {
      console.warn("[WorkflowRunner] Already running");
      return false;
    }

    this.reset();
    this.status = "running";
    this.abortController = new AbortController();

    const totalNodes = graph.nodes.length;
    this.emitProgress(totalNodes);

    await this.injectWorkflowSummary(sessionId, graph, context);

    const executionOrder = this.topologicalSort(graph);

    for (const nodeId of executionOrder) {
      if (this.abortController.signal.aborted) {
        this.status = "cancelled";
        this.emitProgress(totalNodes);
        return false;
      }

      const node = graph.nodes.find((n) => n.id === nodeId);
      if (!node) continue;

      this.currentNodeId = nodeId;
      this.emitProgress(totalNodes);

      const success = await this.executeNode(sessionId, node);

      if (success) {
        this.completedNodes.add(nodeId);
      } else {
        this.failedNodes.add(nodeId);
        this.status = "failed";
        this.emitProgress(totalNodes);
        return false;
      }

      this.emitProgress(totalNodes);
    }

    this.status = "completed";
    this.currentNodeId = null;
    this.emitProgress(totalNodes);
    return true;
  }

  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  private reset(): void {
    this.status = "idle";
    this.currentNodeId = null;
    this.completedNodes.clear();
    this.failedNodes.clear();
    this.abortController = null;
  }

  private async injectWorkflowSummary(
    sessionId: string,
    graph: WorkflowGraph,
    context: ContextSnapshot
  ): Promise<void> {
    const summary = this.buildWorkflowSummary(graph);

    await this.contextInjector.inject(sessionId, context);

    try {
      await this.client.promptNoReply(sessionId, summary);
    } catch (err) {
      console.error("[WorkflowRunner] Failed to inject workflow summary:", err);
    }
  }

  private buildWorkflowSummary(graph: WorkflowGraph): string {
    const lines = [
      WORKFLOW_HEADER,
      `Nodes: ${graph.nodes.length}`,
      `Entry points: ${graph.entryPoints.join(", ")}`,
      "",
      "Tasks:",
    ];

    for (const node of graph.nodes) {
      const deps = node.dependencies.length > 0
        ? ` (depends on: ${node.dependencies.join(", ")})`
        : "";
      lines.push(`  - [${node.type}] ${node.id}${deps}`);
    }

    return lines.join("\n");
  }

  private async executeNode(sessionId: string, node: WorkflowNode): Promise<boolean> {
    console.log(`[WorkflowRunner] Executing node: ${node.id} (${node.type})`);

    try {
      switch (node.type) {
        case "prompt":
          await this.client.promptNoReply(sessionId, node.content);
          break;

        case "file":
          const fileContent = await this.readFileContent(node.content);
          if (fileContent) {
            await this.client.promptNoReply(
              sessionId,
              `[File: ${node.content}]\n\`\`\`\n${fileContent}\n\`\`\``
            );
          }
          break;

        case "output":
          await this.client.promptNoReply(sessionId, `[Output marker] ${node.content}`);
          break;

        case "decision":
          await this.client.promptNoReply(sessionId, `[Decision point] ${node.content}`);
          break;
      }

      return true;
    } catch (err) {
      console.error(`[WorkflowRunner] Node ${node.id} failed:`, err);
      return false;
    }
  }

  private async readFileContent(path: string): Promise<string | null> {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file instanceof TFile) {
      return await this.app.vault.read(file);
    }
    return null;
  }

  private topologicalSort(graph: WorkflowGraph): string[] {
    const result: string[] = [];
    const visited = new Set<string>();
    const temp = new Set<string>();

    const visit = (nodeId: string): void => {
      if (visited.has(nodeId)) return;
      if (temp.has(nodeId)) return;

      temp.add(nodeId);

      const node = graph.nodes.find((n) => n.id === nodeId);
      if (node) {
        for (const dep of node.dependencies) {
          visit(dep);
        }
      }

      temp.delete(nodeId);
      visited.add(nodeId);
      result.push(nodeId);
    };

    for (const node of graph.nodes) {
      visit(node.id);
    }

    return result;
  }

  private emitProgress(totalNodes: number): void {
    const progress: WorkflowProgress = {
      status: this.status,
      currentNodeId: this.currentNodeId,
      completedNodes: Array.from(this.completedNodes),
      failedNodes: Array.from(this.failedNodes),
      totalNodes,
    };

    for (const handler of this.progressHandlers) {
      try {
        handler(progress);
      } catch (err) {
        console.error("[WorkflowRunner] Progress handler error:", err);
      }
    }
  }
}
