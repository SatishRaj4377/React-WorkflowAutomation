import { NodeModel, Point, PointPortModel, PortConstraints, PortModel, PortVisibility, Diagram } from "@syncfusion/ej2-react-diagrams";
import { NodeCategories, NodeConfig, NodePortDirection, NodeType, PortConfiguration, PortSide } from "../../types";
import { PORT_POSITIONS } from "../../constants";
import { NODE_REGISTRY } from "../../constants/nodeRegistry";
import { isAiAgentNode } from "./nodeUtils";

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

// Build concrete ports from a declarative PortConfiguration
function buildPortsFromConfig(config: PortConfiguration): PortModel[] {
  const ports: PortModel[] = [];
  if (config.topPort) ports.push(createPort("top-port", PORT_POSITIONS.TOP, "Circle", 20, PortConstraints.InConnect));
  if (config.rightPort) ports.push(createPort("right-port", PORT_POSITIONS.RIGHT, "Circle", 20, PortConstraints.OutConnect | PortConstraints.Draw));
  if (config.rightTopPort) ports.push(createPort("right-top-port", PORT_POSITIONS.RIGHT_TOP, "Circle", 20, PortConstraints.OutConnect | PortConstraints.Draw));
  if (config.rightBottomPort) ports.push(createPort("right-bottom-port", PORT_POSITIONS.RIGHT_BOTTOM, "Circle", 20, PortConstraints.OutConnect | PortConstraints.Draw));
  // if bottomleft port is true, then ports are for ai agent node, so we will use the use the AI agent left port position, otherwise use the default left port position.
  if (config.leftPort) ports.push(createPort("left-port", config.bottomLeftPort ? PORT_POSITIONS.AI_AGENT_LEFT : PORT_POSITIONS.LEFT, "Circle", 20, PortConstraints.InConnect));
  if (config.bottomLeftPort) ports.push(createPort("bottom-left-port", PORT_POSITIONS.BOTTOM_LEFT, "Square", 14, PortConstraints.OutConnect | PortConstraints.Draw));
  if (config.bottomRightPort) ports.push(createPort("bottom-right-port", PORT_POSITIONS.BOTTOM_RIGHT, "Square", 14, PortConstraints.OutConnect | PortConstraints.Draw));
  return ports;
}

// Single source of truth for category fallbacks (used only if registry lacks config)
const DEFAULT_PORT_CONFIG_BY_CATEGORY: Record<NodeCategories, PortConfiguration> = {
  'ai-agent': { leftPort: true, rightPort: true, bottomLeftPort: true, bottomRightPort: true },
  'condition': { leftPort: true, rightTopPort: true, rightBottomPort: true },
  'trigger': { rightPort: true },
  'tool': { topPort: true },
  'action': { leftPort: true, rightPort: true },
  'sticky': { leftPort: true, rightPort: true },
};

function resolvePortConfiguration(nodeConfig: NodeConfig): PortConfiguration {
  const entry = NODE_REGISTRY[nodeConfig.nodeType as NodeType];
  if (entry?.portConfig) return entry.portConfig;
  return DEFAULT_PORT_CONFIG_BY_CATEGORY[nodeConfig.category];
}

// New API: always prefer registry; fall back to category defaults only if needed
export function getPortsForNode(input: NodeConfig | NodeType | NodeCategories): PortModel[] {
  if (typeof input === 'object' && (input as NodeConfig).nodeType) {
    return buildPortsFromConfig(resolvePortConfiguration(input as NodeConfig));
  }

  const typeOrCategory = input as any;
  const entry = NODE_REGISTRY[typeOrCategory as NodeType];
  if (entry) {
    return buildPortsFromConfig(entry.portConfig ?? DEFAULT_PORT_CONFIG_BY_CATEGORY[entry.category]);
  }

  return buildPortsFromConfig(DEFAULT_PORT_CONFIG_BY_CATEGORY[typeOrCategory as NodeCategories]);
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
  // Infers the direction of a port based on its offset and returns side + offset for userhandle placement
  const inferMeta = (port: PortModel): { direction: NodePortDirection; side: PortSide; offset: number } => {
    const pointPort = port as PointPortModel;
    if (pointPort?.offset) {
      const { x, y } = pointPort.offset as Point;
      // Right side
      if (x === PORT_POSITIONS.RIGHT.x && y === PORT_POSITIONS.RIGHT.y)
        return { direction: 'right', side: 'Right', offset: y } as any;
      if (x === PORT_POSITIONS.RIGHT_TOP.x && y === PORT_POSITIONS.RIGHT_TOP.y)
        return { direction: 'right-top', side: 'Right', offset: y } as any;
      if (x === PORT_POSITIONS.RIGHT_BOTTOM.x && y === PORT_POSITIONS.RIGHT_BOTTOM.y)
        return { direction: 'right-bottom', side: 'Right', offset: y } as any;

      // Bottom side
      if (x === PORT_POSITIONS.BOTTOM_LEFT.x && y === PORT_POSITIONS.BOTTOM_LEFT.y)
        return { direction: 'bottom-left', side: 'Bottom', offset: x } as any;
      if (x === PORT_POSITIONS.BOTTOM_MIDDLE.x && y === PORT_POSITIONS.BOTTOM_MIDDLE.y)
        return { direction: 'bottom-middle', side: 'Bottom', offset: x } as any;
      if (x === PORT_POSITIONS.BOTTOM_RIGHT.x && y === PORT_POSITIONS.BOTTOM_RIGHT.y)
        return { direction: 'bottom-right', side: 'Bottom', offset: x } as any;

      // Dynamic: if port lies on right edge (x ~ 1), treat as right with custom offset
      if (Math.abs(x - 1) < 0.0001) {
        return { direction: 'right', side: 'Right', offset: y } as any;
      }
    }
    return { direction: 'right', side: 'Right', offset: 0.5 } as any; // Default fallback
  };

  if (!node.ports) return;

  const connectablePorts = node.ports
    .filter(
      (p) =>
        p.constraints !== undefined &&
        (p.constraints & PortConstraints.OutConnect) !== 0 &&
        (p.constraints & PortConstraints.Draw) !== 0
    )
    .map((port) => {
      const meta = inferMeta(port);
      return {
        portId: port.id,
        direction: meta.direction,
        side: meta.side,
        offset: meta.offset,
      };
    });

  if (connectablePorts.length > 0) {
    if (!node.addInfo) node.addInfo = {};
    (node.addInfo as any).userHandlesAtPorts = connectablePorts;
  }
}

// Get the appropriate port rendering configuration for a node in the template
export const getNodePortConfiguration = (nodeConfig: NodeConfig): PortConfiguration => resolvePortConfiguration(nodeConfig);

// ---- Dynamic Switch Case Ports ----
export function createSwitchCasePorts(count: number): PortModel[] {
  const ports: PortModel[] = [];
  // left input
  ports.push(createPort("left-port", PORT_POSITIONS.LEFT, "Circle", 20, PortConstraints.InConnect));

  // distribute y offsets between 0.2 and 0.8 based on count
  const start = 0.2;
  const end = 0.8;
  const step = count > 1 ? (end - start) / (count - 1) : 0;
  for (let i = 0; i < count; i++) {
    const y = count === 1 ? 0.5 : start + i * step;
    ports.push(
      createPort(`right-case-${i + 1}`, { x: 1, y }, "Circle", 20, PortConstraints.OutConnect | PortConstraints.Draw)
    );
  }
  return ports;
}

export function initializeSwitchCaseNodePorts(node: NodeModel, rulesCount: number = 1) {
  const count = Math.max(1, rulesCount);
  node.ports = createSwitchCasePorts(count);
  const start = 0.2;
  const end = 0.8;
  const step = count > 1 ? (end - start) / (count - 1) : 0;
  const offsets = Array.from({ length: count }, (_, i) => (count === 1 ? 0.5 : start + i * step));
  if (!node.addInfo) node.addInfo = {} as any;
  (node.addInfo as any).dynamicCaseOffsets = offsets;
  (node.addInfo as any).dynamicCaseCount = count;
  prepareUserHandlePortData(node);
}

export function updateSwitchPorts(diagram: Diagram | null, nodeId: string, rulesCount: number) {
  if (!diagram) return;
  const node = diagram.getObject(nodeId) as NodeModel | null;
  if (!node) return;

  const count = Math.max(1, rulesCount);

  // Update ports dynamically
  node.ports = createSwitchCasePorts(count);

  // Store offsets for template rendering
  const start = 0.2;
  const end = 0.8;
  const step = count > 1 ? (end - start) / (count - 1) : 0;
  const offsets = Array.from({ length: count }, (_, i) => (count === 1 ? 0.5 : start + i * step));
  if (!node.addInfo) node.addInfo = {} as any;
  (node.addInfo as any).dynamicCaseOffsets = offsets;
  (node.addInfo as any).dynamicCaseCount = count;

  // Adjust height to give space for handles visually
  const baseHeight = 80;
  const extraPerRule = 22;
  node.height = baseHeight + Math.max(0, count - 1) * extraPerRule;

  prepareUserHandlePortData(node);
  try {
    (diagram as any).dataBind();
    (diagram as any).refresh();
  } catch {}
}
