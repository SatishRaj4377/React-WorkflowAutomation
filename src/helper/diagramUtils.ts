import { DiagramComponent, NodeModel, Point, PointPortModel, PortConstraints, PortModel, SnapConstraints } from "@syncfusion/ej2-react-diagrams";
import { DiagramSettings, NodePortDirection, PortSide } from "../types";
import html2canvas from "html2canvas";

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


// Generates an optimized thumbnail from an HTML element and returns it as a base64 encoded JPEG.
export const generateOptimizedThumbnail = async (elementId: string): Promise<string | undefined> => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.warn(`Element with ID "${elementId}" not found for thumbnail generation.`);
    return undefined;
  }

  try {
    // Render with a specific scale, then resize precisely for optimization
    const canvas = await html2canvas(element as HTMLElement, {
      backgroundColor: '#ffffff',
      scale: 1,
      useCORS: true,
      logging: false,
      allowTaint: true,
    });

    // Define target dimensions for the thumbnail
    const maxW = 420;
    const maxH = 240;

    // Calculate the best-fit ratio to maintain aspect ratio without stretching
    const ratio = Math.min(maxW / canvas.width, maxH / canvas.height, 1);
    const outW = Math.max(1, Math.round(canvas.width * ratio));
    const outH = Math.max(1, Math.round(canvas.height * ratio));

    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = outW;
    outputCanvas.height = outH;
    const ctx = outputCanvas.getContext('2d');

    if (ctx) {
      // Enable image smoothing for better quality on downscaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(canvas, 0, 0, outW, outH);

      // Return JPEG with moderate quality to keep file size small
      return outputCanvas.toDataURL('image/jpeg', 0.65);
    }
    
    return undefined;
  } catch (error) {
    console.warn('Thumbnail generation failed, continuing without thumbnail.', error);
    return undefined;
  }
};

export const getDefaultDiagramSettings = (): DiagramSettings =>{
  const diagramSettings: DiagramSettings = {
    gridStyle: 'dotted',
    connectorType: 'Bezier',
    connectorCornerRadius: 10,
    snapping: {isEnabled: false, enableSnapToGrid: false, enableSnapToObjects: false},
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
  return diagramSettings?.connectorType ;
};

export const getConnectorCornerRadius = (diagramSettings: DiagramSettings) => {
  if (diagramSettings?.connectorType === 'Orthogonal') return diagramSettings.connectorCornerRadius;
  return 0;
};

export const bringConnectorsToFront = (diagram: DiagramComponent)=> {
  // Select all connectors
  diagram.select(diagram.connectors);

  // Move selected connectors forward
  diagram.moveForward();

  // Clear selection to avoid UI side effects
  diagram.clearSelection();
}
