import { NodeModel } from "@syncfusion/ej2-react-diagrams";
import { NodeConfig, NodeDimensions, NodeTemplate } from "../../types";
import { getPortsForNode } from "./portUtils";
import { NODE_DIMENSIONS } from "../../constants";

// Creates a new node model from a node template
export const createNodeFromTemplate = (
  nodeTemplate: NodeTemplate,
  position?: { x: number; y: number }
): NodeModel => {
  const nodeId = `${nodeTemplate.id}-${Date.now()}`;
  const nodeConfig: NodeConfig = {
    id: nodeId,
    nodeType: nodeTemplate.nodeType,
    category: nodeTemplate.category,
    displayName: nodeTemplate.name,
    icon: nodeTemplate.iconId,
    settings: { general: {}, authentication: {}, advanced: {} },
  };

  const node: NodeModel = {
    id: nodeId,
    offsetX: position?.x,
    offsetY: position?.y,
    addInfo: { nodeConfig },
    // Use the new registry-driven API (falls back to category mapping if needed)
    ports: getPortsForNode(nodeConfig)
  };

  initializeNodeDimensions(node);
  return node;
};

// Calculates the optimal position for a new node based on the source node and port.
export const calculateNewNodePosition = (sourceNode: NodeModel, portId: string): { offsetX: number, offsetY: number } => {
  const {
    offsetX: baseX = 80,
    offsetY: baseY = 80,
    width: nodeWidth = 150,
    height: nodeHeight = 100
  } = sourceNode;

  const horizontalSpacing = nodeWidth * 2;
  const verticalSpacing = nodeHeight * 2;
  const padding = 50;

  // Start with a sensible default position (to the right of the source node)
  let offsetX = baseX + horizontalSpacing;
  let offsetY = baseY;

  // Handle specific port IDs for fine-tuned positioning
  switch (portId) {
    // --- AI Agent Ports ---
    case 'bottom-left-port':
      offsetX = baseX - (nodeWidth + padding / 2);
      offsetY = baseY + verticalSpacing;
      break;
    case 'bottom-right-port':
      offsetX = baseX + (nodeWidth + padding / 2);
      offsetY = baseY + verticalSpacing;
      break;

    // --- IF Condition Ports ---
    case 'right-top-port':
      offsetX = baseX + horizontalSpacing;
      offsetY = baseY - (nodeHeight / 2 + padding); // To the right and above
      break;
    case 'right-bottom-port':
      offsetX = baseX + horizontalSpacing;
      offsetY = baseY + (nodeHeight / 2 + padding); // To the right and below
      break;

    // --- Dynamic Switch Case Ports (right-case-1, 2, ...) ---
    default:
      if (portId.startsWith('right-case-')) {
        const idx = parseInt(portId.replace('right-case-', ''), 10) || 1;
        offsetX = baseX + horizontalSpacing;
        // spread vertically around the source
        const spread = nodeHeight + padding;
        const normalized = (idx - 1); // 0-based
        offsetY = baseY - spread / 2 + normalized * (padding * 2);
      }
      break;
  }

  return { offsetX, offsetY };
};

// Safely retrieves NodeConfig from a node's addInfo
export const getNodeConfig = (node: NodeModel | null | undefined): NodeConfig | undefined => {
  if (!node?.addInfo) return undefined;
  return (node.addInfo as any)?.nodeConfig;
};

// Get node display name safely
export const getNodeDisplayName = (node: NodeModel | null | undefined): string => {
  const config = getNodeConfig(node);
  return config?.displayName || 'Unnamed Node';
};

export const getNodeDimensions = (node: NodeModel): NodeDimensions => {
  const config = getNodeConfig(node);

  if (!config) return NODE_DIMENSIONS.DEFAULT;

  if (isAiAgentNode(config)) return NODE_DIMENSIONS.AI_AGENT;
  if (isStickyNote(config)) return NODE_DIMENSIONS.STICKY_NOTE;

  return NODE_DIMENSIONS.DEFAULT;
};

// Initialize node dimensions while preserving existing valid dimensions
export const initializeNodeDimensions = (node: NodeModel) => {
  const dimensions = getNodeDimensions(node);
  const nodeConfig = getNodeConfig(node);

  if (!node.width || node.width === 0) node.width = dimensions.WIDTH;
  if (!node.height || node.height === 0) node.height = dimensions.HEIGHT;

  if (nodeConfig && isStickyNote(nodeConfig) && dimensions.MIN_WIDTH && dimensions.MIN_HEIGHT) {
    node.minWidth = dimensions.MIN_WIDTH;
    node.minHeight = dimensions.MIN_HEIGHT;
  }
};

// Validate node position
export const hasValidPosition = (node: NodeModel): boolean => {
  return Boolean(
    node.offsetX &&
    node.offsetX !== 0 &&
    node.offsetY &&
    node.offsetY !== 0
  );
};


// Check if a node is valid and has proper configuration
export const isValidNode = (node: NodeModel | null | undefined): boolean => {
  if (!node) return false;
  const config = getNodeConfig(node);
  return Boolean(config && config.id && config.category);
};

// Check if a node is a trigger type
export const isTriggerNode = (nodeConfig: NodeConfig): boolean =>
  nodeConfig?.category === 'trigger';

// Check if a node is an action type
export const isActionNode = (nodeConfig: NodeConfig): boolean =>
  nodeConfig?.category === 'action';

// Check if a node is a condition type
export const isConditionNode = (nodeConfig: NodeConfig): boolean =>
  nodeConfig?.category === 'condition';

// Check if a node is an AI agent type
export const isAiAgentNode = (nodeConfig: NodeConfig): boolean =>
  nodeConfig?.category === 'ai-agent';

// Check if a node is a sticky note
export const isStickyNote = (nodeConfig: NodeConfig): boolean =>
  nodeConfig?.category === 'sticky';

// Check if node is an if/switch condition type
export const isIfConditionNode = (nodeConfig: NodeConfig): boolean =>
   nodeConfig?.category === 'condition' && nodeConfig.nodeType === 'If Condition';

// Check if node is a tool type
export const isToolNode = (nodeConfig: NodeConfig): boolean =>
  nodeConfig?.category === 'tool';

// Check if node is a switch case node
export const isSwitchNode = (nodeConfig: NodeConfig): boolean =>
  nodeConfig?.nodeType === 'Switch Case';
