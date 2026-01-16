import { App, TFile } from "obsidian";
import {
  CanvasData,
  CanvasNode,
  CanvasEdge,
  WorkflowGraph,
  WorkflowNode,
  CompileResult,
} from "./CanvasTypes";

export class CanvasCompiler {
  private app: App;

  constructor(app: App) {
    this.app = app;
  }

  async compile(canvasPath: string): Promise<CompileResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const file = this.app.vault.getAbstractFileByPath(canvasPath);
    if (!file || !(file instanceof TFile)) {
      return { success: false, errors: [`Canvas file not found: ${canvasPath}`], warnings };
    }

    if (!canvasPath.endsWith(".canvas")) {
      return { success: false, errors: ["File is not a .canvas file"], warnings };
    }

    let canvasData: CanvasData;
    try {
      const content = await this.app.vault.read(file);
      canvasData = JSON.parse(content) as CanvasData;
    } catch (err) {
      return { success: false, errors: [`Failed to parse canvas: ${err}`], warnings };
    }

    if (!canvasData.nodes || !Array.isArray(canvasData.nodes)) {
      return { success: false, errors: ["Invalid canvas: missing nodes array"], warnings };
    }

    const validationErrors = this.validateRefs(canvasData);
    if (validationErrors.length > 0) {
      errors.push(...validationErrors);
    }

    const cycleError = this.detectCycles(canvasData);
    if (cycleError) {
      errors.push(cycleError);
    }

    if (errors.length > 0) {
      return { success: false, errors, warnings };
    }

    const graph = this.buildGraph(canvasData);

    return { success: true, graph, errors: [], warnings };
  }

  private validateRefs(data: CanvasData): string[] {
    const errors: string[] = [];
    const nodeIds = new Set(data.nodes.map((n) => n.id));

    for (const edge of data.edges || []) {
      if (!nodeIds.has(edge.fromNode)) {
        errors.push(`Edge ${edge.id} references unknown fromNode: ${edge.fromNode}`);
      }
      if (!nodeIds.has(edge.toNode)) {
        errors.push(`Edge ${edge.id} references unknown toNode: ${edge.toNode}`);
      }
    }

    return errors;
  }

  private detectCycles(data: CanvasData): string | null {
    const adjacency = new Map<string, string[]>();
    for (const node of data.nodes) {
      adjacency.set(node.id, []);
    }
    for (const edge of data.edges || []) {
      const deps = adjacency.get(edge.fromNode);
      if (deps) {
        deps.push(edge.toNode);
      }
    }

    const visited = new Set<string>();
    const recStack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      visited.add(nodeId);
      recStack.add(nodeId);

      for (const neighbor of adjacency.get(nodeId) || []) {
        if (!visited.has(neighbor)) {
          if (hasCycle(neighbor)) return true;
        } else if (recStack.has(neighbor)) {
          return true;
        }
      }

      recStack.delete(nodeId);
      return false;
    };

    for (const node of data.nodes) {
      if (!visited.has(node.id)) {
        if (hasCycle(node.id)) {
          return "Cycle detected in workflow graph";
        }
      }
    }

    return null;
  }

  private buildGraph(data: CanvasData): WorkflowGraph {
    const dependencyMap = new Map<string, string[]>();
    for (const node of data.nodes) {
      dependencyMap.set(node.id, []);
    }
    for (const edge of data.edges || []) {
      const deps = dependencyMap.get(edge.toNode);
      if (deps) {
        deps.push(edge.fromNode);
      }
    }

    const workflowNodes: WorkflowNode[] = data.nodes.map((node) => ({
      id: node.id,
      type: this.inferNodeType(node),
      content: this.extractContent(node),
      dependencies: dependencyMap.get(node.id) || [],
      metadata: {
        originalType: node.type,
        x: node.x,
        y: node.y,
      },
    }));

    const entryPoints = workflowNodes
      .filter((n) => n.dependencies.length === 0)
      .map((n) => n.id);

    return {
      version: "openwork.workflow.v1",
      nodes: workflowNodes,
      entryPoints,
    };
  }

  private inferNodeType(node: CanvasNode): WorkflowNode["type"] {
    if (node.type === "file") return "file";
    if (node.type === "text") {
      const text = (node.text || "").toLowerCase();
      if (text.includes("@output") || text.includes("@result")) return "output";
      if (text.includes("@if") || text.includes("@decision")) return "decision";
      return "prompt";
    }
    return "prompt";
  }

  private extractContent(node: CanvasNode): string {
    if (node.type === "text") return node.text || "";
    if (node.type === "file") return node.file || "";
    if (node.type === "link") return node.url || "";
    return "";
  }
}
