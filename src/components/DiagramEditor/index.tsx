import React, { useRef, useEffect } from 'react';
import {
  DiagramComponent,
  SnapSettingsModel,
  GridlinesModel,
  Inject,
  ConnectorModel,
  NodeModel,
  SnapConstraints,
  DiagramTools,
  UndoRedo,
  DataBinding,
  HierarchicalTree
} from '@syncfusion/ej2-react-diagrams';
import { NodeConfig } from '../../types';
import './DiagramEditor.css';

interface DiagramEditorProps {
  selectedNodeId?: string;
  onNodeSelect: (nodeId: string | null) => void;
  onNodeConfigChange: (nodeId: string, config: NodeConfig) => void;
  nodes?: NodeModel[];
  connectors?: ConnectorModel[];
}

const DiagramEditor: React.FC<DiagramEditorProps> = ({
  selectedNodeId,
  onNodeSelect,
  onNodeConfigChange,
  nodes: externalNodes,
  connectors: externalConnectors
}) => {
  const diagramRef = useRef<DiagramComponent>(null);

  // Grid and Snap Settings
  const snapSettings: SnapSettingsModel = {
    constraints: SnapConstraints.All,
    horizontalGridlines: {
      lineColor: 'rgba(0, 0, 0, 0.1)',
      lineDashArray: '2,2',
    } as GridlinesModel,
    verticalGridlines: {
      lineColor: 'rgba(0, 0, 0, 0.1)',
      lineDashArray: '2,2',
    } as GridlinesModel,
  };

  // Default nodes if none provided externally
  const defaultNodes: NodeModel[] = [
    {
      id: 'start-node',
      width: 140,
      height: 60,
      offsetX: 200,
      offsetY: 100,
      annotations: [
        {
          id: 'start-label',
          content: 'Start Trigger',
          style: { color: 'white', bold: true }
        }
      ],
      shape: { type: 'Flow', shape: 'Terminator' },
      style: {
        fill: 'linear-gradient(45deg, #667eea, #764ba2)',
        strokeColor: '#5a67d8',
        strokeWidth: 2,
      },
      ports: [
        {
          id: 'right-port',
          offset: { x: 1, y: 0.5 },
          shape: 'Circle',
          height: 8,
          width: 8,
        }
      ],
      addInfo: {
        nodeConfig: {
          id: 'start-node',
          type: 'trigger',
          name: 'Start Trigger',
          icon: '▶️',
          settings: { general: {} },
          disabled: false,
          position: { x: 200, y: 100 }
        } as NodeConfig
      }
    },
    {
      id: 'action-node',
      width: 140,
      height: 60,
      offsetX: 400,
      offsetY: 100,
      annotations: [
        {
          id: 'action-label',
          content: 'Send Email',
          style: { color: 'white', bold: true }
        }
      ],
      shape: { type: 'Flow', shape: 'Process' },
      style: {
        fill: 'linear-gradient(45deg, #48bb78, #38a169)',
        strokeColor: '#2f855a',
        strokeWidth: 2,
      },
      ports: [
        {
          id: 'left-port',
          offset: { x: 0, y: 0.5 },
          shape: 'Circle',
          height: 8,
          width: 8,
        },
        {
          id: 'right-port',
          offset: { x: 1, y: 0.5 },
          shape: 'Circle',
          height: 8,
          width: 8,
        }
      ],
      addInfo: {
        nodeConfig: {
          id: 'action-node',
          type: 'action',
          name: 'Send Email',
          icon: '📧',
          settings: { general: {} },
          disabled: false,
          position: { x: 400, y: 100 }
        } as NodeConfig
      }
    }
  ];

  // Default connectors if none provided externally
  const defaultConnectors: ConnectorModel[] = [
    {
      id: 'connector1',
      sourceID: 'start-node',
      targetID: 'action-node',
      sourcePortID: 'right-port',
      targetPortID: 'left-port',
      type: 'Bezier',
      style: {
        strokeColor: '#667eea',
        strokeWidth: 2,
      },
      targetDecorator: {
        style: {
          fill: '#667eea',
          strokeColor: '#667eea',
        }
      }
    }
  ];

  // Context Menu Items for the diagram (works via contextMenuSettings)
  const contextMenuSettings = {
    show: true,
    items: [
      {
        text: 'Select All',
        id: 'selectAll',
        iconCss: 'e-icons e-select-all'
      },
      {
        text: 'Add Sticky Note',
        id: 'addSticky',
        iconCss: 'e-icons e-note'
      },
      {
        text: 'Lock Workflow',
        id: 'lockWorkflow',
        iconCss: 'e-icons e-lock'
      },
      {
        text: 'Add Node',
        id: 'addNode',
        iconCss: 'e-icons e-plus'
      },
      {
        text: 'Auto Align',
        id: 'autoAlign',
        iconCss: 'e-icons e-align-center'
      }
    ],
    showCustomMenuOnly: false,
  };

  // Event Handlers
  const handleSelectionChange = (args: any) => {
    if (args.newValue && args.newValue.length > 0) {
      const selectedNode = args.newValue[0];
      if (selectedNode.id) {
        onNodeSelect(selectedNode.id);
      }
    } else {
      onNodeSelect(null);
    }
  };

  const handleContextMenuClick = (args: any) => {
    switch (args.item.id) {
      case 'selectAll':
        diagramRef.current?.selectAll();
        break;
      case 'addSticky':
        addStickyNote(args.clickPosition || { x: 300, y: 300 });
        break;
      case 'lockWorkflow':
        console.log('Lock workflow');
        break;
      case 'addNode':
        console.log('Add node at', args.clickPosition);
        break;
      case 'autoAlign':
        autoAlignNodes();
        break;
      default:
        break;
    }
  };

  const addStickyNote = (position: { x: number; y: number }) => {
    const stickyNote: NodeModel = {
      id: `sticky-${Date.now()}`,
      width: 120,
      height: 120,
      offsetX: position.x,
      offsetY: position.y,
      shape: { type: 'Basic', shape: 'Rectangle' },
      style: {
        fill: '#fff59d',
        strokeColor: '#f57f17',
        strokeWidth: 1,
      },
      annotations: [
        {
          id: 'sticky-text',
          content: 'Sticky Note',
          style: { color: '#424242', fontSize: 12 }
        }
      ],
      zIndex: -1, // Keep sticky notes behind other elements
      addInfo: {
        nodeConfig: {
          id: `sticky-${Date.now()}`,
          type: 'sticky',
          name: 'Sticky Note',
          icon: '📝',
          settings: { general: { color: '#fff59d', text: 'Sticky Note' } },
          disabled: false,
          position: position
        } as NodeConfig
      }
    };

    diagramRef.current?.add(stickyNote);
  };

  const autoAlignNodes = () => {
    if (diagramRef.current) {
      // Simple auto-align logic - arrange nodes in a grid
      const nodes = diagramRef.current.nodes;
      let x = 100;
      let y = 100;
      const spacing = 200;

      nodes.forEach((node, index) => {
        if ((node.addInfo as any)?.nodeConfig?.type !== 'sticky') {
          node.offsetX = x;
          node.offsetY = y;

          x += spacing;
          if ((index + 1) % 4 === 0) {
            x = 100;
            y += spacing;
          }
        }
      });

      diagramRef.current.dataBind();
    }
  };

  useEffect(() => {
    // Set up diagram tools and other configurations
    if (diagramRef.current) {
      diagramRef.current.tool = DiagramTools.Default;
    }
  }, []);

  return (
    <div className="diagram-editor-container">
      <DiagramComponent
        id="workflow-diagram"
        ref={diagramRef}
        width="100%"
        height="100%"
        nodes={externalNodes || defaultNodes}
        connectors={externalConnectors || defaultConnectors}
        snapSettings={snapSettings}
        contextMenuSettings={contextMenuSettings}
        selectionChange={handleSelectionChange}
        contextMenuClick={handleContextMenuClick}
        backgroundColor="transparent"
        pageSettings={{
          background: {
            color: 'transparent',
          },
          showPageBreaks: false,
        }}
      >
        <Inject services={[
          UndoRedo,
          DataBinding,
          HierarchicalTree
        ]} />
      </DiagramComponent>
    </div>
  );
};

export default DiagramEditor;