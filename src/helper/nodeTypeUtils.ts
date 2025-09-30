import { NodeConfig } from '../types';

// Check if a node is a trigger type
export const isTriggerNode = (nodeConfig: NodeConfig): boolean => 
  nodeConfig?.category === 'trigger';

// Check if a node is an action type
export const isActionNode = (nodeConfig: NodeConfig): boolean => 
  nodeConfig?.category === 'action';

// Check if a node is a condition type
export const isConditionNode = (nodeConfig: NodeConfig): boolean => 
  nodeConfig?.category === 'condition';

// Check if a node is an AI agent type
export const isAiAgentNode = (nodeConfig: NodeConfig): boolean => 
  nodeConfig?.category === 'ai-agent';

// Check if a node is a sticky note
export const isStickyNote = (nodeConfig: NodeConfig): boolean => 
  nodeConfig?.category === 'sticky';

// Check if node is an if/switch condition type
export const isIfOrSwitchCondition = (nodeConfig: NodeConfig): boolean => 
  isConditionNode(nodeConfig) && 
  (nodeConfig.nodeType === 'If Condition' || nodeConfig.nodeType === 'Switch Case');

// Get the appropriate port rendering configuration for a node
interface PortConfiguration {
  leftPort?: boolean;
  rightPort?: boolean;
  rightTopPort?: boolean;
  rightBottomPort?: boolean;
  bottomLeftPort?: boolean;
  bottomMiddlePort?: boolean;
  bottomRightPort?: boolean;
}

export const getNodePortConfiguration = (nodeConfig: NodeConfig): PortConfiguration => {
  if (isTriggerNode(nodeConfig)) {
    return { rightPort: true };
  }
  
  if (isIfOrSwitchCondition(nodeConfig)) {
    return { leftPort: true, rightTopPort: true, rightBottomPort: true };
  }
  
  if (isAiAgentNode(nodeConfig)) {
    return {
      leftPort: true,
      rightPort: true,
      bottomLeftPort: true,
      bottomMiddlePort: true,
      bottomRightPort: true
    };
  }
  
  // Default for action nodes
  return { leftPort: true, rightPort: true };
};