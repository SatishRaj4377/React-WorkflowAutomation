import { DiagramComponent } from "@syncfusion/ej2-react-diagrams";
import { NodeConfig } from "../types";

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

    // Node content based on type
    let contentHtml = `
        <div class="node-img-content">
        <img src="${nodeConfig.iconUrl}" alt="${nodeConfig.name}" />
        </div>
    `;

    // Add a special class for different node types
    const nodeTypeClass =
        isIfCondition ? 'condition-node' :
            isAiAgent ? 'ai-agent-node' : '';

    return `
        <div class="node-template-container">
        <div class="node-template ${nodeTypeClass}" data-node-id="${nodeId}">
            ${portsHtml}
            ${contentHtml}
        </div>
        <div class="node-name-bar">${nodeConfig.name ? nodeConfig.name : ''}</div>
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
