import React, { useState } from 'react';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { TextBoxComponent } from '@syncfusion/ej2-react-inputs';
import { NodeTemplate, PaletteCategory } from '../../types';
import './Sidebar.css';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNodeDrag?: (nodeTemplate: NodeTemplate, position: { x: number; y: number }) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  onNodeDrag
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['Triggers', 'Core']);

  // Sample node templates
  const nodeCategories: PaletteCategory[] = [
    {
      name: 'Triggers',
      collapsed: false,
      nodes: [
        {
          id: 'webhook-trigger',
          name: 'Webhook',
          icon: '🌐',
          type: 'trigger',
          category: 'Triggers',
          description: 'Receive HTTP requests from external services'
        },
        {
          id: 'schedule-trigger',
          name: 'Schedule',
          icon: '⏰',
          type: 'trigger',
          category: 'Triggers',
          description: 'Trigger workflow on a schedule'
        },
        {
          id: 'email-trigger',
          name: 'Email Received',
          icon: '📧',
          type: 'trigger',
          category: 'Triggers',
          description: 'Trigger when email is received'
        },
        {
          id: 'file-trigger',
          name: 'File Watcher',
          icon: '📁',
          type: 'trigger',
          category: 'Triggers',
          description: 'Watch for file changes'
        }
      ]
    },
    {
      name: 'Core',
      collapsed: false,
      nodes: [
        {
          id: 'http-request',
          name: 'HTTP Request',
          icon: '🔗',
          type: 'action',
          category: 'Core',
          description: 'Make HTTP requests to APIs'
        },
        {
          id: 'send-email',
          name: 'Send Email',
          icon: '✉️',
          type: 'action',
          category: 'Core',
          description: 'Send email notifications'
        },
        {
          id: 'data-transform',
          name: 'Transform Data',
          icon: '🔄',
          type: 'action',
          category: 'Core',
          description: 'Transform and manipulate data'
        },
        {
          id: 'condition',
          name: 'Condition',
          icon: '❓',
          type: 'action',
          category: 'Core',
          description: 'Add conditional logic'
        },
        {
          id: 'delay',
          name: 'Delay',
          icon: '⏱️',
          type: 'action',
          category: 'Core',
          description: 'Add delays to workflow'
        }
      ]
    },
    {
      name: 'Flow',
      collapsed: true,
      nodes: [
        {
          id: 'merge',
          name: 'Merge',
          icon: '🔀',
          type: 'action',
          category: 'Flow',
          description: 'Merge multiple data streams'
        },
        {
          id: 'split',
          name: 'Split',
          icon: '🔃',
          type: 'action',
          category: 'Flow',
          description: 'Split data into multiple streams'
        },
        {
          id: 'loop',
          name: 'Loop',
          icon: '🔁',
          type: 'action',
          category: 'Flow',
          description: 'Loop through data items'
        }
      ]
    },
    {
      name: 'Custom',
      collapsed: true,
      nodes: [
        {
          id: 'custom-code',
          name: 'Custom Code',
          icon: '💻',
          type: 'action',
          category: 'Custom',
          description: 'Execute custom JavaScript code'
        },
        {
          id: 'form-node',
          name: 'Form',
          icon: '📝',
          type: 'form',
          category: 'Custom',
          description: 'Create interactive forms'
        }
      ]
    }
  ];

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryName)
        ? prev.filter(name => name !== categoryName)
        : [...prev, categoryName]
    );
  };

  const filteredCategories = nodeCategories.map(category => ({
    ...category,
    nodes: category.nodes.filter(node =>
      node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.nodes.length > 0);

  const handleNodeClick = (nodeTemplate: NodeTemplate) => {
    // For now, just log the click. In a real implementation,
    // this would initiate drag-and-drop or add node to diagram
    console.log('Node clicked:', nodeTemplate.name);
    if (onNodeDrag) {
      onNodeDrag(nodeTemplate, { x: 300, y: 200 });
    }
  };

  const handleDragStart = (e: React.DragEvent, nodeTemplate: NodeTemplate) => {
    e.dataTransfer.setData('application/json', JSON.stringify(nodeTemplate));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="custom-sidebar">
      <div className="sidebar-header">
        <h3 className="sidebar-title">Node Palette</h3>
        <ButtonComponent
          cssClass="close-btn"
          iconCss="e-icons e-close"
          onClick={onClose}
        />
      </div>

      <div className="sidebar-content">
        <div className="search-section">
          <TextBoxComponent
            placeholder="Search nodes..."
            value={searchTerm}
            change={(e: any) => setSearchTerm(e.value)}
            cssClass="search-input"
            showClearButton={true}
          />
        </div>

        <div className="categories-container">
          {filteredCategories.map((category) => (
            <div key={category.name} className="category-section">
              <div
                className="category-header"
                onClick={() => toggleCategory(category.name)}
              >
                <span className={`category-icon ${expandedCategories.includes(category.name) ? 'expanded' : ''}`}>
                  ▶
                </span>
                <span className="category-title">{category.name}</span>
                <span className="category-count">({category.nodes.length})</span>
              </div>

              {expandedCategories.includes(category.name) && (
                <div className="category-nodes">
                  {category.nodes.map((node) => (
                    <div
                      key={node.id}
                      className="node-item"
                      onClick={() => handleNodeClick(node)}
                      draggable
                      onDragStart={(e) => handleDragStart(e, node)}
                      title={node.description}
                    >
                      <div className="node-icon">{node.icon}</div>
                      <div className="node-info">
                        <div className="node-name">{node.name}</div>
                        <div className="node-description">{node.description}</div>
                      </div>
                      <div className={`node-type-badge ${node.type}`}>
                        {node.type}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {filteredCategories.length === 0 && searchTerm && (
            <div className="no-results">
              <div className="no-results-icon">🔍</div>
              <p>No nodes found matching "{searchTerm}"</p>
            </div>
          )}
        </div>
      </div>

      <div className="sidebar-footer">
        <div className="help-text">
          <small>💡 Drag nodes to the canvas to add them to your workflow</small>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;