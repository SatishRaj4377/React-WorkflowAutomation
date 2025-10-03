
import { Diagram } from '@syncfusion/ej2-diagrams';
import { ExecutionContext, Variable, VariableGroup } from '../types';
import { getNodeConfig } from './utilities';

// Helper to recursively parse a JSON object and create a flat list of variables
const parseObjectToVariables = (
  obj: any,
  keyPrefix = '',
  pathPrefix = ''
): Variable[] => {
  if (obj === null || typeof obj !== 'object') {
    return [];
  }

  return Object.keys(obj).reduce((acc: Variable[], key: string) => {
    const value = obj[key];
    const currentKey = keyPrefix ? `${keyPrefix}.${key}` : key;
    const currentPath = pathPrefix ? `${pathPrefix}.${key}` : key;

    let type: Variable['type'] = undefined;
    let preview: string | undefined = String(value);

    if (Array.isArray(value)) {
      type = 'array';
      preview = `[${value.length} items]`;
    } else if (value === null) {
      type = 'any'; // Changed from null to any to satisfy type constraints
      preview = 'null';
    } else if (typeof value === 'object') {
      type = 'object';
      preview = '{...}';
    } else {
      type = typeof value as 'string' | 'number' | 'boolean';
    }

    // Add the current key
    acc.push({
      key: currentKey,
      path: currentPath,
      preview: preview,
      type: type,
    });

    // If it's a nested object, recurse
    if (type === 'object') {
      acc.push(...parseObjectToVariables(value, currentKey, currentPath));
    }
    
    // If it's an array of objects, parse the first item as an example
    if (type === 'array' && value.length > 0 && typeof value[0] === 'object') {
      const arrayKey = `${currentKey}[n]`;
      const arrayPath = `${currentPath}[n]`;
      acc.push(...parseObjectToVariables(value[0], arrayKey, arrayPath));
    }

    return acc;
  }, []);
};

/**
 * Gets the output of a single node and transforms it into a VariableGroup.
 * Used for the "Output" tab.
 */
export const getNodeOutputAsVariableGroup = (
  nodeId: string,
  diagram: Diagram,
  context: ExecutionContext
): VariableGroup | null => {
  const node = diagram.getObject(nodeId);
  const nodeConfig = node ? getNodeConfig(node) : null;
  const outputData = context.results[nodeId];

  if (!nodeConfig || !outputData) {
    return null;
  }

  const variables = parseObjectToVariables(outputData, '', nodeId);

  return {
    nodeId: nodeId,
    nodeName: nodeConfig.displayName,
    nodeType: nodeConfig.nodeType,
    variables: variables,
  };
};

/**
 * Finds all predecessor nodes and returns their outputs as a list of VariableGroups.
 * Used to populate the Variable Picker for a given node.
 */
export const getAvailableVariablesForNode = (
  nodeId: string,
  diagram: Diagram,
  context: ExecutionContext
): VariableGroup[] => {
  const predecessors = new Set<string>();
  const queue: string[] = [nodeId];
  
  // BFS traversal to find all nodes that come before the current one
  while(queue.length > 0) {
    const currentNodeId = queue.shift()!;
    (diagram.connectors || []).forEach(conn => {
      if (conn.targetID === currentNodeId && conn.sourceID) {
        if (!predecessors.has(conn.sourceID)) {
          predecessors.add(conn.sourceID);
          queue.push(conn.sourceID);
        }
      }
    })
  }

  const variableGroups: VariableGroup[] = [];
  predecessors.forEach(predecessorId => {
    const group = getNodeOutputAsVariableGroup(predecessorId, diagram, context);
    if (group) {
      variableGroups.push(group);
    }
  });

  return variableGroups;
};
