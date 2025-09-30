import { ConnectorModel, DiagramComponent, NodeConstraints, NodeModel, Point, PointPortModel, PortConstraints, PortModel, PortVisibility, SnapConstraints } from "@syncfusion/ej2-react-diagrams";
import { DiagramSettings, NodeCategories, NodeConfig, NodeDimensions, NodePortDirection, NodeTemplate, PortConfiguration, PortSide } from "../../types";
import { NODE_DIMENSIONS, PORT_POSITIONS } from "../../constants";
import html2canvas from "html2canvas";
import { getNodeConfig, isAiAgentNode, isIfOrSwitchCondition, isStickyNote, isTriggerNode } from "./nodeUtils";

// Returns the first selected node in the diagram
export function getFirstSelectedNode(diagram: DiagramComponent | null | undefined): NodeModel | undefined {
  if (!diagram || !diagram.selectedItems || !Array.isArray(diagram.selectedItems.nodes)) return undefined;
  if (diagram.selectedItems.nodes.length === 0) return undefined;
  return diagram.selectedItems.nodes[0];
}

// Sets the constraints for nodes
export function updateNodeConstraints(node: NodeModel) {
  const nodeConfig = getNodeConfig(node);

  // Base constraints remain the same
  let baseConstraints = NodeConstraints.Default &
    ~NodeConstraints.Rotate &
    ~NodeConstraints.InConnect &
    ~NodeConstraints.OutConnect;

  // For sticky note node, don't hide the thumbs (this enables resizing for sticky notes)
  node.constraints = nodeConfig && isStickyNote(nodeConfig)
    ? baseConstraints
    : (baseConstraints & ~NodeConstraints.Resize) | NodeConstraints.HideThumbs | NodeConstraints.ReadOnly;
}

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

export const getDefaultDiagramSettings = (): DiagramSettings => {
  const diagramSettings: DiagramSettings = {
    gridStyle: 'dotted',
    connectorType: 'Orthogonal',
    connectorCornerRadius: 10,
    snapping: { isEnabled: true, enableSnapToGrid: true, enableSnapToObjects: false },
    showOverview: true,
    showOverviewAlways: false,
  };
  return diagramSettings;
}

export const getGridType = (diagramSettings: DiagramSettings) => {
  if (!diagramSettings?.gridStyle || diagramSettings.gridStyle === 'none') return 'Lines';
  return diagramSettings.gridStyle === 'lines' ? 'Lines' : 'Dots';
};

export const getGridColor = (diagramSettings: DiagramSettings) => {
  if (diagramSettings?.gridStyle === 'none') return 'transparent';
  if (diagramSettings?.gridStyle === 'lines') return 'var(--grid-line-color)';
  return 'var(--grid-dotted-color)';
};

export const getSnapConstraints = (diagramSettings: DiagramSettings) => {
  if (!diagramSettings?.snapping.isEnabled) return SnapConstraints.ShowLines;

  let constraints = SnapConstraints.ShowLines;
  if (diagramSettings?.snapping.enableSnapToGrid) {
    constraints |= SnapConstraints.SnapToLines        // snaps to both H & V grid lines (grid)
  }
  if (diagramSettings?.snapping.enableSnapToObjects) {
    constraints |= SnapConstraints.SnapToObject;      // snaps to nearby objects
  }

  return constraints;

};

export const getConnectorType = (diagramSettings: DiagramSettings) => {
  return diagramSettings?.connectorType;
};

export const getConnectorCornerRadius = (diagramSettings: DiagramSettings) => {
  if (diagramSettings?.connectorType === 'Orthogonal') return diagramSettings.connectorCornerRadius;
  return 0;
};

export const bringConnectorsToFront = (diagram: DiagramComponent) => {
  // Select all connectors
  diagram.select(diagram.connectors);

  // Move selected connectors forward
  diagram.bringToFront();

  // Clear selection to avoid UI side effects
  diagram.clearSelection();
}