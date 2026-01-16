export interface CanvasNode {
  id: string;
  type: "text" | "file" | "link" | "group";
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  file?: string;
  url?: string;
  label?: string;
}

export interface CanvasEdge {
  id: string;
  fromNode: string;
  toNode: string;
  fromSide?: "top" | "bottom" | "left" | "right";
  toSide?: "top" | "bottom" | "left" | "right";
  label?: string;
}

export interface CanvasData {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

export interface WorkflowNode {
  id: string;
  type: "prompt" | "file" | "output" | "decision";
  content: string;
  dependencies: string[];
  metadata?: Record<string, unknown>;
}

export interface WorkflowGraph {
  version: "openwork.workflow.v1";
  nodes: WorkflowNode[];
  entryPoints: string[];
}

export interface CompileResult {
  success: boolean;
  graph?: WorkflowGraph;
  errors: string[];
  warnings: string[];
}
