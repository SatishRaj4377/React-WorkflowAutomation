import { ConnectorModel } from "@syncfusion/ej2-react-diagrams";
import { getNodeConfig } from "./nodeUtils";

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

export const isConnectorBetweenAgentAndTool = (connector: any, diagramInstance: any): boolean => {
    // Find source and target nodes by their IDs
    const sourceNode = diagramInstance.nodes.find((node: any) => node.id === connector.sourceID);
    const targetNode = diagramInstance.nodes.find((node: any) => node.id === connector.targetID);

    // If either node is not found, return false (though this shouldn't happen for valid connectors)
    if (!sourceNode || !targetNode) return false;

    // Assuming nodes have a 'category' property matching the NodeCategories type
    const sourceCategory = getNodeConfig(sourceNode)?.category;
    const targetCategory = getNodeConfig(targetNode)?.category;

    // Check if one end is ai-agent and the other is tool (order doesn't matter)
    return sourceCategory === "ai-agent" && targetCategory === 'tool';
  };