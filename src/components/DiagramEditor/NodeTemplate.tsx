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

  const nodeIconSrc = nodeConfig.icon ? IconRegistry[nodeConfig.icon] : null;
  const nodeCategory = nodeConfig?.category;
  const isIfOrSwitchCondition = nodeCategory === 'condition' && (nodeConfig.nodeType === 'If Condition' || nodeConfig.nodeType === 'Switch Case');
  const isAiAgent = nodeConfig.id && nodeConfig.id.includes('ai-agent');
  
  return (
    <div className="node-template-container">
      <div className={`node-template ${nodeCategory === 'trigger' ? 'trigger-node' : ''}`} data-node-id={`${id}`}>
        {/* Port Rendering Logic... */}
        {/* For Trigger Nodes, show port only at the right side */}
        {nodeCategory === 'trigger' && <div className="node-port-right"></div>}
        {(nodeCategory === 'action' || nodeCategory === 'condition') && !isIfOrSwitchCondition && !isAiAgent && (
          <>
            <div className="node-port-left"></div>
            <div className="node-port-right"></div>
          </>
        )}
        {/* For If condition Nodes, show port on left and also two output ports in the right */}
        {isIfOrSwitchCondition && (
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
            {typeof nodeIconSrc === 'string' && (
              <img
                src={nodeIconSrc}
                draggable={false}
              />
            )}
            {isAiAgent && (
              <span className='ai-agent-name-bar'>{nodeConfig.displayName ? nodeConfig.displayName : ''}</span>
            )}
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