import React from 'react';
import { NodeConfig, NodeToolbarAction } from '../../types';
import { IconRegistry } from '../../assets/icons';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { getNodePortConfiguration, isAiAgentNode, isSwitchNode } from '../../helper/utilities';

interface NodeTemplateProps {
  id: string;
  addInfo: { nodeConfig: NodeConfig; };
  onNodeToolbarAction?: (id: string, action: NodeToolbarAction) => void;
}

const NodeTemplate: React.FC<NodeTemplateProps> = ({ id, addInfo, onNodeToolbarAction }) => {
  // Destructure and validate nodeConfig
  const { nodeConfig } = addInfo;
  if (!nodeConfig || typeof nodeConfig !== 'object') {
    console.warn(`Invalid node configuration for node ${id}`);
    return <div>Invalid Node</div>;
  }

  const nodeIconSrc = nodeConfig.icon ? IconRegistry[nodeConfig.icon] : null;
  const portConfig = getNodePortConfiguration(nodeConfig);
  const isAiAgent = isAiAgentNode(nodeConfig);

  const isRightPortOnly  = portConfig.rightPort && !portConfig.leftPort;

  // Dynamic Switch Case rendering support
  const dynamicCaseOffsets: number[] = (addInfo as any)?.dynamicCaseOffsets || [];
  const isSwitchCase = isSwitchNode(nodeConfig);
  
  return (
    <div className="node-template-container">
      <div className={`node-template ${isRightPortOnly ? 'trigger-node' : portConfig.topPort ? 'tool-node' : ''}`} data-node-id={`${id}`} >
        {/* Show Node actions toolbar on hover */}
        <div className="node-hover-toolbar">
          <ButtonComponent title='Execute this node' iconCss='e-icons e-play' className="node-toolbar-btn" onClick={() => onNodeToolbarAction?.(id, 'execute-step')} />
          <ButtonComponent title='Edit' iconCss='e-icons e-edit' className="node-toolbar-btn" onClick={() => onNodeToolbarAction?.(id, 'edit')} />
          <ButtonComponent title='Delete' iconCss='e-icons e-trash' className="node-toolbar-btn" onClick={() => onNodeToolbarAction?.(id, 'delete')} />
        </div>

        {/* Port Rendering Logic based on configuration */}
        {portConfig.topPort && <div className="node-port-top"></div>}
        {portConfig.leftPort && <div className="node-port-left"></div>}
        {(portConfig.rightPort && !isSwitchCase) && <div className="node-port-right"></div>}
        {isSwitchCase
          ? (
              // Render N right-side ports (case 1..N) for Switch Case
              (dynamicCaseOffsets.length > 0 ? dynamicCaseOffsets : [0.5]).map((y, i) => (
                <div
                  key={`right-case-${i + 1}`}
                  className="node-port-right"
                  style={{ top: `${y * 100}%`}}
                >
                  <span className='switch-conditon-node-port-label'>{i + 1}</span>
                </div>
              ))
            )
          : (
              // Fallback for If Condition (true/false)
              <>
                {portConfig.rightTopPort && (
                  <div className="node-port-right-top"><span className='if-conditon-node-port-label'>true</span></div>
                )}
                {portConfig.rightBottomPort && (
                  <div className="node-port-right-bottom"><span className='if-conditon-node-port-label'>false</span></div>
                )}
              </>
            )}
        {portConfig.bottomLeftPort && <div className="node-port-bottom-left"><span className='agent-node-port-label'>AI Model</span></div>}
        {portConfig.bottomRightPort && <div className="node-port-bottom-right"><span className='agent-node-port-label'>Tool</span></div>}
        
        {/* Icon and Name Rendering... */}
        <div className="node-img-content" style={isAiAgent ? { gap: '1.2rem' } : {}}>
            {typeof nodeIconSrc === 'string' && (
              <img
                src={nodeIconSrc}
                draggable={false}
              />
            )}
            {isAiAgent && (
              <span className='ai-agent-name-bar' title={nodeConfig.displayName}>{nodeConfig.displayName || ''}</span>
            )}
        </div>
      </div>
      {!isAiAgent && nodeConfig.displayName && (
        <div className="node-name-bar">
          {nodeConfig.displayName}
        </div>
      )}
    </div>
  );
};

export default NodeTemplate;