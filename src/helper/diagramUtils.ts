import { DiagramComponent, NodeModel, SnapConstraints } from "@syncfusion/ej2-react-diagrams";
import { DiagramSettings } from "../types";
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
      backgroundColor: '#bbc7d6',
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
    connectorType: 'Orthogonal',
    connectorCornerRadius: 10,
    snapping: {isEnabled: true, enableSnapToGrid: true, enableSnapToObjects: false},
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
  diagram.bringToFront();

  // Clear selection to avoid UI side effects
  diagram.clearSelection();
}
