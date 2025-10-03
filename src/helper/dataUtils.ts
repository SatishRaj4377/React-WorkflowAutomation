import { Diagram } from '@syncfusion/ej2-diagrams';
import { ExecutionContext, VariableGroup } from '../types';
import { flattenJsonToVariables } from './jsonVarUtils';

/** Try multiple common places where a project's ExecutionContext might store outputs */
function pickNodeOutputFromContext(context: any, nodeId: string): any {
  if (!context) return undefined;
  // Common shapes we've seen across workflow engines
  return (
    context.outputs?.[nodeId] ??
    context.results?.[nodeId] ??
    context.nodeOutputs?.[nodeId] ??
    context.nodes?.[nodeId]?.output ??
    context[nodeId]?.output ??
    context[nodeId] // last-resort: direct bucket
  );
}

/** Derive node type/name from Diagram node (best-effort, with safe fallbacks) */
function getNodeIdentity(diagram: Diagram, nodeId: string): { nodeType: string; nodeName: string } {
  const nt: any =
    (diagram as any).nameTable?.[nodeId] ??
    ((diagram as any).nodes || []).find((n: any) => n.id === nodeId);

  const nodeType =
    nt?.data?.nodeType ??
    nt?.addInfo?.nodeType ??
    nt?.annotations?.[0]?.content ??
    'Node';

  const nodeName =
    nt?.data?.displayName ??
    nt?.addInfo?.displayName ??
    nt?.annotations?.[0]?.content ??
    nt?.id ??
    nodeId;

  return { nodeType, nodeName };
}

/** Produce VariableGroup for a single node using raw output in context */
export function getNodeOutputAsVariableGroup(
  nodeId: string,
  diagram: Diagram,
  context: ExecutionContext
): VariableGroup | null {
  const raw = pickNodeOutputFromContext(context, nodeId);
  if (raw === undefined) return null; // no output yet for this node
  const variables = flattenJsonToVariables(raw); // emits all leaves, incl. arrays

  const { nodeType, nodeName } = getNodeIdentity(diagram, nodeId);
  return {
    nodeId,
    nodeType,
    nodeName,
    variables,
  };
}

/** Return all predecessor groups (BFS using EJ2 APIs with safe fallback) */
export const getAvailableVariablesForNode = (
  nodeId: string,
  diagram: Diagram,
  context: ExecutionContext
): VariableGroup[] => {
  if (!diagram) return [];

  const predecessors = new Set<string>();
  const queue: string[] = [nodeId];

  const getInEdges = typeof (diagram as any).getInEdges === 'function'
    ? (id: string) => ((diagram as any).getInEdges(id) || []) as string[]
    : (_: string) => [] as string[];

  const getConnector = typeof (diagram as any).getConnectorObject === 'function'
    ? (cid: string) => (diagram as any).getConnectorObject(cid)
    : (_: string) => null;

  const allConnectors: any[] = ((diagram as any).connectors || []) as any[];

  while (queue.length) {
    const current = queue.shift()!;

    // Prefer EJ2 API
    const inEdgeIds = getInEdges(current);
    if (inEdgeIds.length) {
      inEdgeIds.forEach((connId) => {
        const conn = getConnector(connId);
        const src = conn?.sourceID;
        if (src && !predecessors.has(src)) {
          predecessors.add(src);
          queue.push(src);
        }
      });
      continue;
    }

    // Fallback scan
    for (const c of allConnectors) {
      if (c?.targetID === current && c?.sourceID) {
        const src = c.sourceID as string;
        if (!predecessors.has(src)) {
          predecessors.add(src);
          queue.push(src);
        }
      }
    }
  }

  const groups = Array.from(predecessors)
    .map((pid) => getNodeOutputAsVariableGroup(pid, diagram, context))
    .filter(Boolean) as VariableGroup[];

  // Debug once; remove in production if noisy
  console.debug('[getAvailableVariablesForNode]', {
    nodeId,
    predecessors: Array.from(predecessors),
    groups: groups.map((g) => g.nodeId),
  });

  return groups;
};