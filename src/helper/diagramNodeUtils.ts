import { NodeModel, ConnectorModel, PortModel, PointPortModel, Point, PortConstraints, PortVisibility, DiagramComponent } from '@syncfusion/ej2-react-diagrams';
import { NodeCategories, NodeConfig, NodeDimensions, NodePortDirection, NodeTemplate, PortSide } from '../types';
import { isAiAgentNode, isStickyNote } from './nodeTypeUtils';
import { NODE_DIMENSIONS, PORT_POSITIONS } from '../constants';

// Convert direction to side
export const getPortSide = (direction: NodePortDirection): PortSide =>
  direction.startsWith('right') ? 'Right' : 'Bottom';

// Convert direction to offset
export const getPortOffset = (direction: NodePortDirection): number => {
  const offsetMap: Record<NodePortDirection, number> = {
    right: 0.5,
    'right-top': 0.3,
    'right-bottom': 0.7,
    'bottom-left': 0.25,
    'bottom-middle': 0.5,
    'bottom-right': 0.75,
  };
  return offsetMap[direction] ?? 0.5;
};

// Returns ports with `OutConnect and Draw` constraints for a given node, along with their direction.
export function getOutConnectDrawPorts(node: NodeModel): Array<{ port: PortModel; direction: NodePortDirection}> {
  // Helper to infer direction from a port's offset
  const inferDirection = (port: PortModel): NodePortDirection => {
    const pointPort = port as PointPortModel;
    if (pointPort && pointPort.offset) {
      // normal action nodes
      if ((pointPort.offset as Point).x === 1 &&
             (pointPort.offset as Point).y === 0.5) return 'right';
      // agent node ports
      if ((pointPort.offset as Point).x === 0.25 &&
             (pointPort.offset as Point).y === 1) return 'bottom-left';
      if ((pointPort.offset as Point).x === 0.5 &&
             (pointPort.offset as Point).y === 1) return 'bottom-middle';
      if ((pointPort.offset as Point).x === 0.75 &&
             (pointPort.offset as Point).y === 1) return 'bottom-right';
      // if condition node ports
      if ((pointPort.offset as Point).x === 1 &&
             (pointPort.offset as Point).y === 0.3) return 'right-top';
      if ((pointPort.offset as Point).x === 1 &&
             (pointPort.offset as Point).y === 0.7) return 'right-bottom';

    }
    return 'right'; // Default fallback
  };

  if (!node.ports) return [];
  
  return node.ports
    .filter(
      (p) =>
        p.constraints !== undefined &&
        (p.constraints & PortConstraints.OutConnect) !== 0 &&
        (p.constraints & PortConstraints.Draw) !== 0
    )
    .map((port) => ({ port, direction: inferDirection(port) }));
}

// Retrieves a specific port from a given node by its ID.
export function getNodePortById(node: NodeModel | null | undefined, portId: string): PortModel | undefined {
  // Ensure the node, its ports array, and the portId are valid before searching
  if (!node || !node.ports || !Array.isArray(node.ports) || !portId) {
    return undefined;
  }
  
  // Find the port that matches the provided ID
  return node.ports.find((p: PortModel) => p.id === portId);
}

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
        case 'bottom-middle-port':
            offsetX = baseX; // Directly below
            offsetY = baseY + verticalSpacing;
            break;
        case 'bottom-right-port':
            offsetX = baseX + (nodeWidth + padding / 2);
            offsetY = baseY + verticalSpacing;
            break;
        
        // --- IF Condition Ports ---
        case 'right-top-port':
            offsetX = baseX + horizontalSpacing;
            offsetY = baseY - (nodeHeight/2 + padding); // To the right and above
            break;
        case 'right-bottom-port':
            offsetX = baseX + horizontalSpacing;
            offsetY = baseY + (nodeHeight/2 + padding); // To the right and below
            break;

        default:
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

// Diagram state management utilities
export const hasDiagramNodes = (diagram: DiagramComponent | null): boolean => {
  return Boolean(diagram?.nodes?.length);
};

export const getNodesOfType = (diagram: DiagramComponent | null, type: string): NodeModel[] => {
  if (!diagram?.nodes) return [];
  return diagram.nodes.filter(node => getNodeConfig(node)?.nodeType === type);
};

export const isNodeSelected = (diagram: DiagramComponent | null, nodeId: string): boolean => {
  return diagram?.selectedItems?.nodes?.some(node => node.id === nodeId) || false;
};

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
    ports: getPortsForNode(nodeTemplate.category)
  };

  initializeNodeDimensions(node);
  return node;
};

export const createPort = (
  id: string,
  offset: { x: number; y: number },
  shape: "Circle" | "Square" = "Circle",
  size: number = 20,
  constraints: PortConstraints,
  tooltip?: string
): PointPortModel => ({
  id,
  offset,
  shape,
  height: size,
  width: size,
  style: { fill: "transparent", strokeColor: "transparent" },
  visibility: PortVisibility.Visible,
  constraints,
  ...(tooltip ? { tooltip: { content: tooltip } } : {}),
});

export const getPortsForNode = (type: NodeCategories): PortModel[] => {
  switch (type) {
    case "ai-agent":
      return [
        createPort("left-port", PORT_POSITIONS.AI_AGENT_LEFT, "Circle", 20, PortConstraints.InConnect),
        createPort("right-port", PORT_POSITIONS.RIGHT, "Circle", 20, PortConstraints.OutConnect | PortConstraints.Draw),
        createPort("bottom-left-port", PORT_POSITIONS.BOTTOM_LEFT, "Square", 14, PortConstraints.OutConnect | PortConstraints.Draw, "Chat Model"),
        createPort("bottom-middle-port", PORT_POSITIONS.BOTTOM_MIDDLE, "Square", 14, PortConstraints.OutConnect | PortConstraints.Draw, "Memory"),
        createPort("bottom-right-port", PORT_POSITIONS.BOTTOM_RIGHT, "Square", 14, PortConstraints.OutConnect | PortConstraints.Draw, "Tools"),
      ];

    case "condition":
      return [
        createPort("left-port", PORT_POSITIONS.LEFT, "Circle", 20, PortConstraints.InConnect),
        createPort("right-top-port", PORT_POSITIONS.RIGHT_TOP, "Circle", 20, PortConstraints.OutConnect | PortConstraints.Draw),
        createPort("right-bottom-port", PORT_POSITIONS.RIGHT_BOTTOM, "Circle", 20, PortConstraints.OutConnect | PortConstraints.Draw),
      ];

    case "trigger":
      return [
        createPort("right-port", PORT_POSITIONS.RIGHT, "Circle", 20, PortConstraints.OutConnect | PortConstraints.Draw),
      ];

    default: // action node
      return [
        createPort("left-port", PORT_POSITIONS.LEFT, "Circle", 20, PortConstraints.InConnect),
        createPort("right-port", PORT_POSITIONS.RIGHT, "Circle", 20, PortConstraints.OutConnect | PortConstraints.Draw),
      ];
  }
};


// Creates a connector between two nodes
export const createConnector = (
  sourceId: string,
  targetId: string,
  sourcePortId: string,
  targetPortId: string = 'left-port'
): ConnectorModel => ({
  id: `connector-${Date.now()}`,
  sourceID: sourceId,
  targetID: targetId,
  sourcePortID: sourcePortId,
  targetPortID: targetPortId
});