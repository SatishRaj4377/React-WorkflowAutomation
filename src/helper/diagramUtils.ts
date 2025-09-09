import { DiagramComponent, NodeModel, Point, PointPortModel, PortConstraints, PortModel } from "@syncfusion/ej2-react-diagrams";
import { NodeConfig, NodePortDirection, PortSide } from "../types";

// HTML Templates for different node types
export const getNodeTemplate = (nodeConfig: NodeConfig, nodeId: string): string => {
    if (!nodeConfig || typeof nodeConfig !== 'object') {
        console.warn('Invalid nodeConfig provided to getNodeTemplate');
        return '<div>Invalid Node</div>';
    }

    // Determine ports HTML based on node type
    let portsHtml = '';

    // Check if the ID contains specific node types
    const isIfCondition = nodeConfig.type === 'condition' ||
        (nodeConfig.id && nodeConfig.id.includes('if-condition'));

    const isAiAgent = nodeConfig.id && nodeConfig.id.includes('ai-agent');

    // Special case for If node with two output ports
    if (isIfCondition) {
        portsHtml = `
        <div class="node-port-left"></div>
        <div class="node-port-right-top true-port"></div>
        <div class="node-port-right-bottom false-port"></div>
        `;
    }
    // Special case for AI Agent with multiple ports
    else if (isAiAgent) {
        portsHtml = `
        <div class="node-port-left"></div>
        <div class="node-port-right"></div>
        <div class="node-port-bottom-left"></div>
        <div class="node-port-bottom-middle"></div>
        <div class="node-port-bottom-right"></div>
        `;
    }
    // Default case for trigger nodes
    else if (nodeConfig.type === 'trigger') {
        portsHtml = `<div class="node-port-right"></div>`;
    }
    // Default case for action nodes
    else {
        portsHtml = `
        <div class="node-port-left"></div>
        <div class="node-port-right"></div>
        `;
    }

    // Add a special class for different node types
    const nodeTypeClass =
        isIfCondition ? 'condition-node' :
            isAiAgent ? 'ai-agent-node' : '';

    return `
        <div class="node-template-container">
        <div class="node-template ${nodeTypeClass}" data-node-id="${nodeId}">
            ${portsHtml}
            <div class="node-img-content">
                <img src="${nodeConfig.iconUrl}" alt="${nodeConfig.name}" />
                <span>${(isAiAgent && nodeConfig.name) ? nodeConfig.name : ''}</span>
            </div>
        </div>
        <div class="node-name-bar">${(!isAiAgent && nodeConfig.name) ? nodeConfig.name : ''}</div>
        </div>
    `;
};

// Get sticky note template
export const getStickyNoteTemplate = (diagram: DiagramComponent, nodeId: string): string => {
    // Get stored markdown content from node data
    const node = diagram?.nodes?.find(n => n.id === nodeId);
    const storedMarkdown = (node?.addInfo as any)?.markdown || 'Double-click to edit\n\nYou can use **bold**, *italic*, `code`, and\n# Headers\n- Lists';
    const markdownHtml = convertMarkdownToHtml(storedMarkdown);

    return `
    <div class="sticky-note-container" data-node-id="${nodeId}">
        <div class="sticky-note-content">
        <div class="markdown-preview" id="preview-${nodeId}" style="display: block;">
            ${markdownHtml}
        </div>
        <textarea class="markdown-editor" 
            id="editor-${nodeId}" 
            style="display: none;"
            placeholder="Type your markdown here..."
        />
        </div>
    </div>
    `;
};

// Simple markdown to HTML converter for sticky node
export const convertMarkdownToHtml = (markdown: string): string => {
    if (!markdown) return '';

    return markdown
        // Headers
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        // Bold and italic
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Code
        .replace(/`(.*?)`/g, '<code>$1</code>')
        // Lists
        .replace(/^- (.*$)/gim, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>')
        // Line Break
        .replace(/\n/g, '<br>');
};

// Returns the first selected node in the diagram
export function getFirstSelectedNode(diagram: DiagramComponent | null | undefined): NodeModel | undefined {
  if (!diagram || !diagram.selectedItems || !Array.isArray(diagram.selectedItems.nodes)) return undefined;
  if (diagram.selectedItems.nodes.length === 0) return undefined;
  return diagram.selectedItems.nodes[0];
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