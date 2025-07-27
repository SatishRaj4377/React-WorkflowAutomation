import React, { useRef, useState } from 'react';
import { 
  SidebarComponent, 
  AccordionComponent, 
  AccordionItemDirective, 
  AccordionItemsDirective 
} from '@syncfusion/ej2-react-navigations';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { TextBoxComponent } from '@syncfusion/ej2-react-inputs';
import { NodeTemplate, PaletteCategory } from '../../types';
import './NodePaletteSidebar.css';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNodeDrag?: (nodeTemplate: NodeTemplate) => void;
}

const NodePaletteSidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  onNodeDrag
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const searchRef = useRef<TextBoxComponent>(null);

  const handleSearchCreated = () => {
    setTimeout(() => {
      if (searchRef.current) {
        searchRef.current.addIcon('prepend', 'e-icons e-search search-icon');
      }
    });
  };
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

  const filteredCategories = nodeCategories.map(category => ({
    ...category,
    nodes: category.nodes.filter(node =>
      node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.nodes.length > 0);

  const handleNodeClick = (nodeTemplate: NodeTemplate) => {
    console.log('Node clicked:', nodeTemplate.name);
    if (onNodeDrag) {
      onNodeDrag(nodeTemplate);
    }
  };

  // Create content for each accordion item
  const createCategoryContent = (category: PaletteCategory) => {
    return (
      <div className="category-nodes">
        {category.nodes.map((node) => (
          <div
            key={node.id}
            className="node-item"
            onClick={() => handleNodeClick(node)}
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
    );
  };

  // Create header template for each accordion item
  const createCategoryHeader = (category: PaletteCategory) => {
    return () => (
      <div className="accordion-header-content">
        <span className="category-title">{category.name}</span>
      </div>
    );
  };

  return (
    <SidebarComponent
      id="node-palette-sidebar"
      className="custom-sidebar"
      width="320px"
      position="Left"
      type="Over"
      isOpen={isOpen}
      closeOnDocumentClick= {true}
      close={onClose}
      target=".editor-content"
    >
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
            ref={searchRef}
            placeholder="Search nodes..."
            value={searchTerm}
            change={(e: any) => setSearchTerm(e.value)}
            cssClass="search-input"
            showClearButton={true}
            created={handleSearchCreated}
          />
        </div>

        <div className="categories-container">
          {filteredCategories.length > 0 ? (
            <AccordionComponent
              className="custom-accordion"
              expandMode="Multiple"
            >
              <AccordionItemsDirective>
                {filteredCategories.map((category) => (
                  <AccordionItemDirective
                    key={category.name}
                    expanded={!category.collapsed}
                    header={createCategoryHeader(category)}
                    content={() => createCategoryContent(category)}
                  />
                ))}
              </AccordionItemsDirective>
            </AccordionComponent>
          ) : searchTerm ? (
            <div className="no-results">
              <div className="no-results-icon">🔍</div>
              <p>No nodes found matching "{searchTerm}"</p>
            </div>
          ) : null}
        </div>
      </div>
    </SidebarComponent>
  );
};

export default NodePaletteSidebar;