import { NodeModel, Point, PointPortModel, PortConstraints, PortModel, PortVisibility } from "@syncfusion/ej2-react-diagrams";
import { NodeCategories, NodeConfig, NodePortDirection, PortConfiguration, PortSide } from "../../types";
import { isAiAgentNode, isIfOrSwitchCondition, isTriggerNode } from "./nodeUtils";
import { PORT_POSITIONS } from "../../constants";

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

// Retrieves a specific port from a given node by its ID.
export function getNodePortById(node: NodeModel | null | undefined, portId: string): PortModel | undefined {
  // Ensure the node, its ports array, and the portId are valid before searching
  if (!node || !node.ports || !Array.isArray(node.ports) || !portId) {
    return undefined;
  }

  // Find the port that matches the provided ID
  return node.ports.find((p: PortModel) => p.id === portId);
}

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

// Store the port ID and direction info for dynamic userhandle rendering
export function prepareUserHandlePortData(node: NodeModel): void {
  // Infers the direction of a port based on its offset
  const inferDirection = (port: PortModel): NodePortDirection => {
    const pointPort = port as PointPortModel;
    if (pointPort?.offset) {
      const { x, y } = pointPort.offset as Point;
      if (x === 1 && y === 0.5) return 'right';
      if (x === 0.25 && y === 1) return 'bottom-left';
      if (x === 0.5 && y === 1) return 'bottom-middle';
      if (x === 0.75 && y === 1) return 'bottom-right';
      if (x === 1 && y === 0.3) return 'right-top';
      if (x === 1 && y === 0.7) return 'right-bottom';
    }
    return 'right'; // Default fallback direction
  };

  if (!node.ports) return;

  // Filter ports that support both OutConnect and Draw constraints
  const connectablePorts = node.ports
    .filter(
      (p) =>
        p.constraints !== undefined &&
        (p.constraints & PortConstraints.OutConnect) !== 0 &&
        (p.constraints & PortConstraints.Draw) !== 0
    )
    // Map each port to its ID and inferred direction
    .map((port) => ({
      portId: port.id,
      direction: inferDirection(port),
    }));

  if (connectablePorts.length > 0) {
    if (!node.addInfo) node.addInfo = {};
    // Store the port ID and direction info under userHandlesAtPorts
    (node.addInfo as any).userHandlesAtPorts = connectablePorts;
  }
}

// Get the appropriate port rendering configuration for a node
export const getNodePortConfiguration = (nodeConfig: NodeConfig): PortConfiguration => {
  if (isTriggerNode(nodeConfig)) {
    return { rightPort: true };
  }

  if (isIfOrSwitchCondition(nodeConfig)) {
    return { leftPort: true, rightTopPort: true, rightBottomPort: true };
  }

  if (isAiAgentNode(nodeConfig)) {
    return {
      leftPort: true,
      rightPort: true,
      bottomLeftPort: true,
      bottomMiddlePort: true,
      bottomRightPort: true
    };
  }

  // Default for action nodes
  return { leftPort: true, rightPort: true };
};