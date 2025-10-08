import React from 'react';
import { NodeConfig, NodeToolbarAction } from '../../types';
import { IconRegistry } from '../../assets/icons';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { getNodePortConfiguration, isAiAgentNode } from '../../helper/utilities';

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
  
  return (
    <div className="node-template-container">
      <div className={`node-template ${portConfig.rightPort && !portConfig.leftPort ? 'trigger-node' : ''}`} data-node-id={`${id}`} >
        
        {/* Show Node actions toolbar on hover */}
        <div className="node-hover-toolbar">
          <ButtonComponent title='Edit' iconCss='e-icons e-edit' className="node-toolbar-btn" onClick={() => onNodeToolbarAction?.(id, 'edit')} />
          <ButtonComponent title='Delete' iconCss='e-icons e-trash' className="node-toolbar-btn" onClick={() => onNodeToolbarAction?.(id, 'delete')} />
        </div>

        {/* Port Rendering Logic based on configuration */}
        {portConfig.leftPort && <div className="node-port-left"></div>}
        {portConfig.rightPort && <div className="node-port-right"></div>}
        {portConfig.rightTopPort && <div className="node-port-right-top"></div>}
        {portConfig.rightBottomPort && <div className="node-port-right-bottom"></div>}
        {portConfig.bottomLeftPort && <div className="node-port-bottom-left"><span className='node-port-label left'>AI Model</span></div>}
        {/* {portConfig.bottomMiddlePort && <div className="node-port-bottom-middle"></div>} */}
        {portConfig.bottomRightPort && <div className="node-port-bottom-right"><span className='node-port-label right'>Tool</span></div>}
        
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