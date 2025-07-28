import React, { useRef, useState } from 'react';
import { 
  SidebarComponent, 
  TabComponent
} from '@syncfusion/ej2-react-navigations';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { TextBoxComponent } from '@syncfusion/ej2-react-inputs';
import { NodeTemplate } from '../../types';
import './NodePaletteSidebar.css';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onAddNode?: (nodeTemplate: NodeTemplate) => void;
}

const NodePaletteSidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  onAddNode
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

  // Sample node templates organized by category
  const triggerNodes: NodeTemplate[] = [
    {
      id: 'webhook-trigger',
      name: 'Webhook',
      icon: '🌐',
      iconUrl: '/icons/webhook.png',
      type: 'trigger',
      category: 'Triggers',
      description: 'Receive HTTP requests from external services'
    },
    {
      id: 'schedule-trigger',
      name: 'Schedule',
      icon: '⏰',
      iconUrl: '/icons/schedule.png',
      type: 'trigger',
      category: 'Triggers',
      description: 'Trigger workflow on a schedule'
    },
    {
      id: 'email-trigger',
      name: 'Email Received',
      icon: '📧',
      iconUrl: '/icons/email.png',
      type: 'trigger',
      category: 'Triggers',
      description: 'Trigger when email is received'
    },
    {
      id: 'file-trigger',
      name: 'File Watcher',
      icon: '📁',
      iconUrl: '/icons/file.png',
      type: 'trigger',
      category: 'Triggers',
      description: 'Watch for file changes'
    }
  ];

  const coreNodes: NodeTemplate[] = [
    {
      id: 'http-request',
      name: 'HTTP Request',
      icon: '🔗',
      iconUrl: '/icons/http.png',
      type: 'action',
      category: 'Core',
      description: 'Make HTTP requests to APIs'
    },
    {
      id: 'send-email',
      name: 'Send Email',
      icon: '✉️',
      iconUrl: '/icons/send-email.png',
      type: 'action',
      category: 'Core',
      description: 'Send email notifications'
    },
    {
      id: 'data-transform',
      name: 'Transform Data',
      icon: '🔄',
      iconUrl: '/icons/transform.png',
      type: 'action',
      category: 'Core',
      description: 'Transform and manipulate data'
    },
    {
      id: 'condition',
      name: 'Condition',
      icon: '❓',
      iconUrl: '/icons/condition.png',
      type: 'action',
      category: 'Core',
      description: 'Add conditional logic'
    },
    {
      id: 'delay',
      name: 'Delay',
      icon: '⏱️',
      iconUrl: '/icons/delay.png',
      type: 'action',
      category: 'Core',
      description: 'Add delays to workflow'
    }
  ];

  const flowNodes: NodeTemplate[] = [
    {
      id: 'merge',
      name: 'Merge',
      icon: '🔀',
      iconUrl: '/icons/merge.png',
      type: 'action',
      category: 'Flow',
      description: 'Merge multiple data streams'
    },
    {
      id: 'split',
      name: 'Split',
      icon: '🔃',
      iconUrl: '/icons/split.png',
      type: 'action',
      category: 'Flow',
      description: 'Split data into multiple streams'
    },
    {
      id: 'loop',
      name: 'Loop',
      icon: '🔁',
      iconUrl: '/icons/loop.png',
      type: 'action',
      category: 'Flow',
      description: 'Loop through data items'
    }
  ];

  const customNodes: NodeTemplate[] = [
    {
      id: 'custom-code',
      name: 'Custom Code',
      icon: '💻',
      iconUrl: '/icons/code.png',
      type: 'action',
      category: 'Custom',
      description: 'Execute custom JavaScript code'
    },
    {
      id: 'form-node',
      name: 'Form',
      icon: '📝',
      iconUrl: '/icons/form.png',
      type: 'form',
      category: 'Custom',
      description: 'Create interactive forms'
    }
  ];

  // Get all nodes for search
  const allNodes = [...triggerNodes, ...coreNodes, ...flowNodes, ...customNodes];

  const filterNodes = (nodes: NodeTemplate[]) => {
    if (!searchTerm) return nodes;
    return nodes.filter(node =>
      node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const handleNodeClick = (nodeTemplate: NodeTemplate) => {
    console.log('Node clicked:', nodeTemplate.name);
    if (onAddNode) {
      onAddNode(nodeTemplate);
    }
  };

  const renderNodeItem = (node: NodeTemplate) => (
    <div
      key={node.id}
      className="node-item"
      onClick={() => handleNodeClick(node)}
      title={node.description}
    >
      <div className="node-icon">
        {node.iconUrl ? (
          <img 
            src={node.iconUrl} 
            alt={node.name} 
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              const placeholder = target.nextElementSibling as HTMLElement;
              target.style.display = 'none';
              if (placeholder) {
                placeholder.style.display = 'flex';
              }
            }} 
          />
        ) : null}
        <div className="icon-placeholder" style={{ display: node.iconUrl ? 'none' : 'flex' }}>
          {node.icon}
        </div>
      </div>
      <div className="node-info">
        <div className="node-name">{node.name}</div>
        <div className="node-description">{node.description}</div>
      </div>
      <div className={`node-type-badge ${node.type}`}>
        {node.type}
      </div>
    </div>
  );

  const renderNodeList = (nodes: NodeTemplate[], categoryName: string) => (
    <div className="tab-content">
      <div className="category-header">
        <h4>{categoryName}</h4>
        <span className="node-count">{filterNodes(nodes).length}</span>
      </div>
      <div className="node-list">
        {filterNodes(nodes).map(renderNodeItem)}
      </div>
    </div>
  );

  const renderSearchResults = () => {
    const searchResults = filterNodes(allNodes);
    return (
      <div className="tab-content">
        <div className="category-header">
          <h4>Search Results</h4>
          <span className="node-count">{searchResults.length}</span>
        </div>
        <div className="node-list">
          {searchResults.length > 0 ? (
            searchResults.map(renderNodeItem)
          ) : (
            <div className="no-results">
              <div className="no-results-icon">🔍</div>
              <p>No nodes found matching "{searchTerm}"</p>
            </div>
          )}
        </div>
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
      closeOnDocumentClick={true}
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

        <div className="tabs-container">
          {searchTerm ? (
            // Show search results in a single view
            renderSearchResults()
          ) : (
            // Show normal tabs when not searching
            <TabComponent id="palette-tabs" cssClass="palette-tabs" heightAdjustMode='Auto' overflowMode='Popup'>
              <div className="e-tab-header">
                <div>Triggers</div>
                <div>Core</div>
                <div>Flow</div>
                <div>Custom</div>
              </div>
              <div className="e-content">
                <div>
                  {renderNodeList(triggerNodes, 'Trigger Nodes')}
                </div>
                <div>
                  {renderNodeList(coreNodes, 'Core Nodes')}
                </div>
                <div>
                  {renderNodeList(flowNodes, 'Flow Control Nodes')}
                </div>
                <div>
                  {renderNodeList(customNodes, 'Custom Nodes')}
                </div>
              </div>
            </TabComponent>
          )}
        </div>
      </div>
    </SidebarComponent>
  );
};

export default NodePaletteSidebar;