import { DiagramComponent } from '@syncfusion/ej2-react-diagrams';
import { NodeModel } from '@syncfusion/ej2-diagrams';
import { ExecutionContext, NodeConfig, NodeExecutionResult, NodeStatus } from '../types';
import { IconRegistry } from '../assets/icons';
import { getNodeConfig, isToolNode, isTriggerNode } from './utilities';

/**
 * Find all trigger nodes in the workflow
 * @param diagram DiagramComponent instance
 * @returns Array of trigger nodes
 */
export const findTriggerNodes = (diagram: DiagramComponent): NodeModel[] => {
  return (diagram?.nodes || []).filter(node => {
    const nodeConfig = getNodeConfig(node);
    if (nodeConfig)
      return isTriggerNode(nodeConfig);
  });
};

/**
 * Checks if there is a trigger node in the workflow
 */
export const diagramHasChatTrigger = (diagram: DiagramComponent) => {
  if (!diagram) return false;
  const triggers = findTriggerNodes(diagram);
  return triggers.some((node: any) => {
    const nodeConfig = getNodeConfig(node);
    return nodeConfig?.nodeType === 'Chat';
  });
};

/**
 * Find nodes connected to the given node via its output ports
 * @param diagram DiagramComponent instance
 * @param nodeId Current node ID
 * @returns Array of connected target nodes
 */
export function findConnectedNodes(diagram: any, nodeId: string) {
  const sourceNode = diagram.getObject(nodeId);
  if (!sourceNode) return [];

  const nodeCfg = getNodeConfig(sourceNode);
  const type = (nodeCfg?.nodeType || '').toLowerCase();

  // Pick main-flow ports for this node
  let allowedSourcePorts: string[];
  if (type === 'ai agent') {
    // AI Agent main flow → right-port only; exclude bottom-* (tools)
    allowedSourcePorts = ['right-port'];
  } else if (type === 'if condition' || type === 'switch case') {
    allowedSourcePorts = ['right-top-port', 'right-bottom-port'];
  } else {
    allowedSourcePorts = ['right-port'];
  }

  const targets = (diagram.connectors || [])
    .filter((conn: any) => conn.sourceID === nodeId && allowedSourcePorts.includes(conn.sourcePortID))
    .map((conn: any) => diagram.getObject(conn.targetID))
    // never traverse into tool nodes
    .filter((node: any) => {
      const nodeConfig = getNodeConfig(node)
      return nodeConfig?.category !== 'tool';
    });

  return targets;
}

/**
 * Get downstream targets connected from a specific port on a node.
 * Handles:
 *  - Exact port match
 *  - Missing sourcePortID (treated as main flow if requestedPort === 'right-port')
 *
 * @param diagram EJ2 diagram instance
 * @param nodeId  Source node ID
 * @param requestedPort Port ID to match (e.g., 'right-port', 'right-top-port', 'right-bottom-port')
 */
export function getTargetsByPort(diagram: any, nodeId: string, requestedPort: string): NodeModel[] {
  const connectors = (diagram?.connectors ?? []) as any[];

  const targets = connectors
    .filter(c => {
      if (c.sourceID !== nodeId) return false;

      // If connector has a sourcePortID, match it
      if (c.sourcePortID) return c.sourcePortID === requestedPort;

      // If no sourcePortID and requestedPort is main flow, accept it
      return requestedPort === 'right-port';
    })
    .map(c => diagram.getObject(c.targetID))
    .filter((n: any) => {
      const nc = (n?.addInfo as any)?.nodeConfig;
      return nc?.category !== 'tool';
    });

  return targets;
}

/**
 * Update the visual state of a node during/after execution
 * @param diagram DiagramComponent instance
 * @param nodeId Node to update
 * @param status New execution status
 */
export const updateNodeStatus = (
  diagram: DiagramComponent,
  nodeId: string,
  status: NodeStatus,
  opts?: { restrictToSourcePortId?: string }
) => {
  // Find the node
  const node = diagram?.getObject(nodeId) as NodeModel;
  if (!node) return;

  // Update node config status
  if (node.addInfo && typeof node.addInfo === 'object') {
    const nodeConfig = (node.addInfo as any).nodeConfig as NodeConfig;
    if (nodeConfig) {
      nodeConfig.status = status;
      if (status === 'running') {
        nodeConfig.executionTime = { start: new Date() };
      } else if (status === 'success' || status === 'error') {
        nodeConfig.executionTime = {
          ...nodeConfig.executionTime,
          end: new Date()
        };
      }
    }
  }

  // Get node container to update visual state
  const nodeContainer = document.querySelector(`.node-template-container:has([data-node-id="${nodeId}"])`);
  if (!nodeContainer) return;

  // Remove existing status classes
  nodeContainer.classList.remove('running', 'success', 'error');
    
  // Add new status class
  if (status !== 'idle') {
    nodeContainer.classList.add(status);
  }

  // Handle spinner for running state
  const spinnerClass = 'node-spinner';
  const existingSpinner = nodeContainer.querySelector(`.${spinnerClass}`);
    
  if (status === 'running') {
    if (!existingSpinner) {
      const spinner = document.createElement('div');
      spinner.className = spinnerClass;
      spinner.innerHTML = `<img src="${IconRegistry.NodeLoader}" draggable="false" alt="Loading..." />`;
      nodeContainer.querySelector('.node-template')?.appendChild(spinner);
    }
  } else if (existingSpinner) {
    existingSpinner.remove();
  }

  // Update connected connectors status
  if (status === 'success' || status === 'error') {
    const connectors = diagram?.connectors ?? [];
    
    // If we are scoping to a specific source port (e.g., IF true/false),
    // first remove success/error classes from ALL outgoing connectors of this node.
    if (opts?.restrictToSourcePortId) {
      connectors.forEach((conn) => {
        if (conn.sourceID !== nodeId) return;
        const pathEl = document.getElementById(`${conn.id}_path`);
        const decEl  = document.getElementById(`${conn.id}_tarDec`);
        pathEl?.classList.remove('workflow-connector-success', 'workflow-connector-error');
        decEl?.classList.remove('workflow-connector-targetDec-success', 'workflow-connector-targetDec-error');
      });
    }

    connectors.forEach(conn => {
      if (conn.sourceID === nodeId) {
        // if scope provided, only paint connectors from that specific port
        if (opts?.restrictToSourcePortId && conn.sourcePortID !== opts.restrictToSourcePortId) return;

        const connectorPath = document.getElementById(`${conn.id}_path`);
        const connectorTargetDecorator = document.getElementById(`${conn.id}_tarDec`);
        if (connectorPath) {
          connectorPath.classList.remove('workflow-connector-success', 'workflow-connector-error');
          connectorPath.classList.add(`workflow-connector-${status}`);
        }
        if (connectorTargetDecorator) {
          connectorTargetDecorator.classList.remove('workflow-connector-targetDec-success', 'workflow-connector-targetDec-error');
          connectorTargetDecorator.classList.add(`workflow-connector-targetDec-${status}`);
        }
      }
    });
  }

  // Refresh diagram to show updated state
  diagram?.dataBind();
};

/**
 * Reset execution state of all nodes and connectors
 * @param diagram DiagramComponent instance
 */
export const resetExecutionStates = (diagram: DiagramComponent) => {
  // Reset node states
  diagram?.nodes.forEach(node => {
    updateNodeStatus(diagram, node.id as string, 'idle');
  });

  // Reset connector states
  diagram?.connectors.forEach(conn => {
    const connectorPath = document.getElementById(`${conn.id}_path`);
    const connectorTargetDec = document.getElementById(`${conn.id}_tarDec`);
    if (connectorPath) {
      connectorPath.classList.remove('workflow-connector-success', 'workflow-connector-error');
    }
    if (connectorTargetDec) {
      connectorTargetDec.classList.remove('workflow-connector-targetDec-success', 'workflow-connector-targetDec-error');
    }
  });
};

/**
 * Delay execution for specified milliseconds
 * @param ms Milliseconds to delay
 */
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Mock node execution with simulated processing time
 * @param node Node to execute
 * @param context Execution context with variables and results
 */
export const mockExecuteNode = async (
  node: NodeModel,
  context: ExecutionContext
): Promise<NodeExecutionResult> => {
  const nodeConfig = (node.addInfo as any)?.nodeConfig as NodeConfig;
  
  // Simulate processing time between 1-3 seconds
  const processingTime = Math.random() * 2000 + 1000;
  await delay(processingTime);

  // Simulate success/failure (90% success rate)
  const success = Math.random() > 0.1;

  if (success) {
    // Simulate node output data
    const outputData = {
      timestamp: new Date().toISOString(),
      nodeType: nodeConfig?.nodeType,
      processedData: `Sample output from ${nodeConfig?.displayName}`,
    };

    // Store result in execution context
    if (node.id) {
      context.results[node.id] = outputData;
    }

    return {
      success: true,
      data: outputData,
    };
  } else {
    return {
      success: false,
      error: `Error executing ${nodeConfig?.displayName}: Simulated failure`,
    };
  }
};


/**
 * Executes a node by sending its config to the backend server.
 * @param node Node to execute
 * @param context Execution context
 */
export const executeNodeOnServer = async (
  node: NodeModel,
  context: ExecutionContext
): Promise<NodeExecutionResult> => {
  const nodeConfig = (node.addInfo as any)?.nodeConfig as NodeConfig;

  try {
    const response = await fetch('http://localhost:3001/execute-node', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ nodeConfig, context }), // Send node config and current context
    });

    const result = await response.json();

    if (!response.ok) {
      // If response status is not 2xx, throw an error
      throw new Error(result.error || 'Server returned an error.');
    }
    
    // Store result in execution context
    if (node.id) {
      context.results[node.id] = result.data;
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown network error occurred.';
    console.error(`Error executing ${nodeConfig?.displayName} on server:`, errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
};