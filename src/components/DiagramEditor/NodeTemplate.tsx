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
  
  return (
    <div className="node-template-container">
      <div className={`node-template`} data-node-id={`${id}`}>
        {/* Port Rendering Logic... */}
        {/* For Trigger Nodes, show port only at the right side */}
        {nodeConfig.category === 'trigger' && <div className="node-port-right"></div>}
        {nodeConfig.category === 'action' && !isIfCondition && !isAiAgent && (
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
        <div className="node-img-content" style={isAiAgent ? { gap: '1.2rem' } : {}}>
          {IconComponent && <IconComponent />}
          <span className='ai-agent-name-bar'>{isAiAgent && nodeConfig.displayName ? nodeConfig.displayName : ''}</span>
        </div>
      </div>
      {!isAiAgent &&(
        <div className="node-name-bar">
          {nodeConfig.displayName ? nodeConfig.displayName : ''}
        </div>
      )}
    </div>
  );
};

export default NodeTemplate;