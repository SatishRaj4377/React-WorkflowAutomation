import { Diagram } from '@syncfusion/ej2-react-diagrams';
import { ToolbarAction } from '../types';

type EditorKeyboardShortcuts = {
    [key: string]: (onAction: (action: ToolbarAction) => void) => void;
};

const editorKeyboardShortcuts: EditorKeyboardShortcuts = {
    // Add Node
    'tab': (onAction) => onAction('addNode'),
    // Add Sticky Note
    'shift+s': (onAction) => onAction('addSticky'),
    // Reset Zoom
    'ctrl+0': (onAction) => onAction('resetZoom'),
    // Fit to Page
    'ctrl+1': (onAction) => onAction('fitToPage'),
};

export const handleEditorKeyDown = (
    e: KeyboardEvent,
    onAction: (action: ToolbarAction) => void,
    isExecuting: boolean,
    isDirty: boolean,
    handleSave: () => void,
    showSuccessToast: (title: string, message: string) => void
) => {
    // Prevent shortcuts firing if inside a text input
    const target = e.target as HTMLElement;
    if (target.matches('input, textarea, [contenteditable="true"]')) {
        return;
    }

    const key = e.key.toLowerCase();
    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;
    
    let shortcut = '';
    if (ctrl) shortcut += 'ctrl+';
    if (shift) shortcut += 'shift+';
    shortcut += key;

    // Save shortcut (Ctrl+S)
    if (shortcut === 'ctrl+s') {
        e.preventDefault();
        if (isDirty) {
            handleSave();
        } else {
            showSuccessToast('No Changes', 'Workflow is already saved.');
        }
        return;
    }
    
    // Check for editor actions only if not executing
    if (!isExecuting) {
        // Find a matching shortcut from the map
        const action = editorKeyboardShortcuts[shortcut];
        if (action) {
            e.preventDefault();
            e.stopPropagation();
            action(onAction);
        }
    }
};
