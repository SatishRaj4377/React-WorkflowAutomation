import { DiagramComponent } from "@syncfusion/ej2-react-diagrams";

// Get sticky note template
export const getStickyNoteTemplate = (diagram: DiagramComponent, nodeId: string): string => {
  // Get stored markdown content from node data
  const node = diagram?.nodes?.find(n => n.id === nodeId);
  const storedMarkdown = (node?.addInfo as any)?.markdown || 'Double-click to edit\n\nYou can use **bold**, *italic*, `code`, and\n# Headers\n- Lists';
  const markdownHtml = convertMarkdownToHtml(storedMarkdown);

  return `
    <div class="sticky-note-container" data-node-id="${nodeId}">
        <button class="sticky-note-delete-btn e-icons e-trash" id="delete-${nodeId}" title="Delete sticky note"></button>
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