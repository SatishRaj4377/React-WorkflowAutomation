import { ConnectorModel } from "@syncfusion/ej2-react-diagrams";

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