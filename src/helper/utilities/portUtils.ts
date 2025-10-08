import { NodeModel, Point, PointPortModel, PortConstraints, PortModel, PortVisibility } from "@syncfusion/ej2-react-diagrams";
import { NodeCategories, NodeConfig, NodePortDirection, PortConfiguration, PortSide } from "../../types";
import { isAiAgentNode, isIfOrSwitchCondition, isToolNode, isTriggerNode } from "./nodeUtils";
import { PORT_POSITIONS } from "../../constants";

export const createPort = (
  id: string,
  offset: { x: number; y: number },
  shape: "Circle" | "Square" = "Circle",
  size: number = 20,
  constraints: PortConstraints,
): PointPortModel => ({
  id,
  offset,
  shape,
  height: size,
  width: size,
  style: { fill: "transparent", strokeColor: "transparent" },
  visibility: PortVisibility.Visible,
  constraints,
});

export const getPortsForNode = (type: NodeCategories): PortModel[] => {
  switch (type) {
    case "ai-agent":
      return [
        createPort("left-port", PORT_POSITIONS.AI_AGENT_LEFT, "Circle", 20, PortConstraints.InConnect),
        createPort("right-port", PORT_POSITIONS.RIGHT, "Circle", 20, PortConstraints.OutConnect | PortConstraints.Draw),
        createPort("bottom-left-port", PORT_POSITIONS.BOTTOM_LEFT, "Square", 14, PortConstraints.OutConnect | PortConstraints.Draw),
        // createPort("bottom-middle-port", PORT_POSITIONS.BOTTOM_MIDDLE, "Square", 14, PortConstraints.OutConnect | PortConstraints.Draw, "Memory"),
        createPort("bottom-right-port", PORT_POSITIONS.BOTTOM_RIGHT, "Square", 14, PortConstraints.OutConnect | PortConstraints.Draw),
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

    case "tool":
      return [
        createPort("top-port", PORT_POSITIONS.TOP, "Circle", 20, PortConstraints.InConnect),
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
    'right': PORT_POSITIONS.RIGHT.y,
    'right-top': PORT_POSITIONS.RIGHT_TOP.y,
    'right-bottom': PORT_POSITIONS.RIGHT_BOTTOM.y,
    'bottom-left': PORT_POSITIONS.BOTTOM_LEFT.x,
    'bottom-middle': PORT_POSITIONS.BOTTOM_MIDDLE.x,
    'bottom-right': PORT_POSITIONS.BOTTOM_RIGHT.x,
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

      if (x === PORT_POSITIONS.RIGHT.x && y === PORT_POSITIONS.RIGHT.y) 
        return 'right';
      if (x === PORT_POSITIONS.BOTTOM_LEFT.x && y === PORT_POSITIONS.BOTTOM_LEFT.y) 
        return 'bottom-left';
      if (x === PORT_POSITIONS.BOTTOM_MIDDLE.x && y === PORT_POSITIONS.BOTTOM_MIDDLE.y) 
        return 'bottom-middle';
      if (x === PORT_POSITIONS.BOTTOM_RIGHT.x && y === PORT_POSITIONS.BOTTOM_RIGHT.y) 
        return 'bottom-right';
      if (x === PORT_POSITIONS.RIGHT_TOP.x && y === PORT_POSITIONS.RIGHT_TOP.y) 
        return 'right-top';
      if (x === PORT_POSITIONS.RIGHT_BOTTOM.x && y === PORT_POSITIONS.RIGHT_BOTTOM.y) 
        return 'right-bottom';
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

  if (isToolNode(nodeConfig)){
    return {
      topPort: true
    }
  }

  // Default for action nodes
  return { leftPort: true, rightPort: true };
};