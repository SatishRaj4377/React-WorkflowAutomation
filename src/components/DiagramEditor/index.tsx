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
  HierarchicalTree,
  DiagramContextMenu,
  NodeConstraints
} from '@syncfusion/ej2-react-diagrams';
import { NodeConfig } from '../../types';
import './DiagramEditor.css';

interface DiagramEditorProps {
  onNodeSelect: (nodeId: string | null) => void;
  nodes?: NodeModel[];
  connectors?: ConnectorModel[];
}

const DiagramEditor: React.FC<DiagramEditorProps> = ({
  onNodeSelect,
  nodes: nodeFromPalette,
  connectors: connectorsFromPalette
}) => {
  const diagramRef = useRef<DiagramComponent>(null);

  // Grid and Snap Settings
  const snapSettings: SnapSettingsModel = {
    constraints: SnapConstraints.All,
    gridType: 'Dots',
    horizontalGridlines: {
      lineColor: '#a6b4caff',
    } as GridlinesModel,
    verticalGridlines: {
      lineColor: '#a6b4caff',
    } as GridlinesModel,
  };

  // HTML Templates for different node types
  const getNodeTemplate = (nodeConfig: NodeConfig): string => {
    const baseStyle = `
      width: 100%; 
      height: 100%; 
      display: flex; 
      align-items: center; 
      justify-content: center;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      border: 2px solid;
      color: white;
      font-weight: bold;
      font-size: 12px;
      text-align: center;
      pointer-events: none;
    `;

    let gradient = 'linear-gradient(135deg, #ffffff, #f0f0f0)';
    let borderColor = '#d1d1d1';
   
    return `
      <div style="${baseStyle} background: ${gradient}; border-color: ${borderColor};">
        <div>
          <div style="font-size: 2.5rem;">${nodeConfig.icon}</div>
        </div>
      </div>
    `;
  };

  // Get default styles for nodes
  const getNodeDefaults = (obj: NodeModel): NodeModel => {
    // Set HTML template based on node configuration
    if (obj.addInfo && (obj.addInfo as any).nodeConfig) {
      const nodeConfig = (obj.addInfo as any).nodeConfig as NodeConfig;
      obj.shape = {
        type: 'HTML',
        content: getNodeTemplate(nodeConfig)
      };
    }

    // Set default ports for all nodes except sticky notes
    if (!(obj.addInfo as any)?.nodeConfig?.type || (obj.addInfo as any)?.nodeConfig?.type !== 'sticky') {
      obj.ports = [
        {
          id: 'left-port',
          offset: { x: 0, y: 0.5 },
          shape: 'Circle',
          height: 8,
          width: 8,
          style: { fill: '#ffffff', strokeColor: '#000000' }
        },
        {
          id: 'right-port',
          offset: { x: 1, y: 0.5 },
          shape: 'Circle',
          height: 8,
          width: 8,
          style: { fill: '#ffffff', strokeColor: '#000000' }
        }
      ];
    }
    return obj;
  };

  // Get default styles for connectors
  const getConnectorDefaults = (obj: ConnectorModel): ConnectorModel => {
    obj.type = 'Bezier';
    obj.style = {
      strokeColor: '#667eea',
      strokeWidth: 2,
    };
    obj.targetDecorator = {
      style: {
        fill: '#667eea',
        strokeColor: '#667eea',
      }
    };
    return obj;
  };

  // Context Menu Items for the diagram
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
      zIndex: -1,
      constraints: (NodeConstraints.Default & ~NodeConstraints.Rotate),
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
        nodes={nodeFromPalette || []}
        connectors={connectorsFromPalette || []}
        getNodeDefaults={getNodeDefaults}
        getConnectorDefaults={getConnectorDefaults}
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
          HierarchicalTree,
          DiagramContextMenu
        ]} />
      </DiagramComponent>
    </div>
  );
};

export default DiagramEditor;