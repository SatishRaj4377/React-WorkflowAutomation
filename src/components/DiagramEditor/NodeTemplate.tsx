import React from 'react';
import { NodeConfig } from '../../types';
import { IconRegistry } from '../../assets/icons';

interface NodeTemplateProps {
  id: string;
  addInfo: {
    nodeConfig: NodeConfig;
  };
}


const NodeTemplate: React.FC<NodeTemplateProps> = ({ id, addInfo }) => {
  // Destructure nodeConfig directly from the addInfo prop
  const { nodeConfig } = addInfo;

  if (!nodeConfig) {
    return <div>Invalid Node</div>;
  }

  const IconComponent = nodeConfig.icon ? IconRegistry[nodeConfig.icon] : null;

  const isIfCondition = nodeConfig.id && nodeConfig.id.includes('if-condition');
  const isAiAgent = nodeConfig.id && nodeConfig.id.includes('ai-agent');
  
  const nodeTypeClass = isIfCondition ? 'condition-node' : isAiAgent ? 'ai-agent-node' : '';

  return (
    <div className="node-template-container">
      <div className={`node-template ${nodeTypeClass}`}>
        {/* Port Rendering Logic... */}
        {/* For Trigger Nodes, show port only at the right side */}
        {nodeConfig.type === 'trigger' && <div className="node-port-right"></div>}
        {nodeConfig.type === 'action' && !isIfCondition && !isAiAgent && (
          <>
            <div className="node-port-left"></div>
            <div className="node-port-right"></div>
          </>
        )}
        {/* For If condition Nodes, show port on left and also two output ports in the right */}
        {isIfCondition && (
          <>
            <div className="node-port-left"></div>
            <div className="node-port-right-top"></div>
            <div className="node-port-right-bottom"></div>
          </>
        )}
        {/* For AI AGent Nodes, show port on left and right and also in the bottom */}
        {isAiAgent && (
          <>
            <div className="node-port-left"></div>
            <div className="node-port-right"></div>
            <div className="node-port-bottom-left"></div>
            <div className="node-port-bottom-middle"></div>
            <div className="node-port-bottom-right"></div>
          </>
        )}
        
        {/* Icon and Name Rendering... */}
        <div className="node-img-content">
          {IconComponent && <IconComponent />}
          <span>{isAiAgent && nodeConfig.name ? nodeConfig.name : ''}</span>
        </div>
      </div>
      <div className="node-name-bar">
        {!isAiAgent && nodeConfig.name ? nodeConfig.name : ''}
      </div>
    </div>
  );
};

export default NodeTemplate;