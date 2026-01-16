import { describe, test, expect } from "bun:test";
import { CanvasData, WorkflowGraph } from "../src/workflow";

function detectCycles(data: CanvasData): boolean {
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
        return true;
      }
    }
  }

  return false;
}

function validateRefs(data: CanvasData): string[] {
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

describe("Canvas Validation", () => {
  test("detectCycles returns false for DAG", () => {
    const data: CanvasData = {
      nodes: [
        { id: "a", type: "text", x: 0, y: 0, width: 100, height: 100 },
        { id: "b", type: "text", x: 0, y: 0, width: 100, height: 100 },
        { id: "c", type: "text", x: 0, y: 0, width: 100, height: 100 },
      ],
      edges: [
        { id: "e1", fromNode: "a", toNode: "b" },
        { id: "e2", fromNode: "b", toNode: "c" },
      ],
    };
    expect(detectCycles(data)).toBe(false);
  });

  test("detectCycles returns true for cyclic graph", () => {
    const data: CanvasData = {
      nodes: [
        { id: "a", type: "text", x: 0, y: 0, width: 100, height: 100 },
        { id: "b", type: "text", x: 0, y: 0, width: 100, height: 100 },
        { id: "c", type: "text", x: 0, y: 0, width: 100, height: 100 },
      ],
      edges: [
        { id: "e1", fromNode: "a", toNode: "b" },
        { id: "e2", fromNode: "b", toNode: "c" },
        { id: "e3", fromNode: "c", toNode: "a" },
      ],
    };
    expect(detectCycles(data)).toBe(true);
  });

  test("validateRefs returns errors for dangling references", () => {
    const data: CanvasData = {
      nodes: [
        { id: "a", type: "text", x: 0, y: 0, width: 100, height: 100 },
      ],
      edges: [
        { id: "e1", fromNode: "a", toNode: "nonexistent" },
      ],
    };
    const errors = validateRefs(data);
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain("nonexistent");
  });

  test("validateRefs returns empty for valid refs", () => {
    const data: CanvasData = {
      nodes: [
        { id: "a", type: "text", x: 0, y: 0, width: 100, height: 100 },
        { id: "b", type: "text", x: 0, y: 0, width: 100, height: 100 },
      ],
      edges: [
        { id: "e1", fromNode: "a", toNode: "b" },
      ],
    };
    const errors = validateRefs(data);
    expect(errors.length).toBe(0);
  });
});

describe("Workflow Graph", () => {
  test("valid workflow graph structure", () => {
    const graph: WorkflowGraph = {
      version: "openwork.workflow.v1",
      nodes: [
        { id: "n1", type: "prompt", content: "Hello", dependencies: [] },
        { id: "n2", type: "file", content: "test.md", dependencies: ["n1"] },
      ],
      entryPoints: ["n1"],
    };
    
    expect(graph.version).toBe("openwork.workflow.v1");
    expect(graph.nodes.length).toBe(2);
    expect(graph.entryPoints).toContain("n1");
  });
});
