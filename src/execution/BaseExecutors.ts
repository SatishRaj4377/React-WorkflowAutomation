import { NodeModel } from '@syncfusion/ej2-diagrams';
import { ExecutionContext, NodeConfig, NodeExecutionResult, NodeExecutor } from '../types';

import { getClientExecutedNodes } from '../constants/nodeRegistry';

export abstract class BaseNodeExecutor implements NodeExecutor {
  abstract executeNode(node: NodeModel, context: ExecutionContext): Promise<NodeExecutionResult>;

  canExecute(node: NodeModel): boolean {
    const nodeConfig = (node.addInfo as any)?.nodeConfig as NodeConfig;
    return this.getSupportedNodeTypes().includes(nodeConfig?.nodeType);
  }

  protected abstract getSupportedNodeTypes(): string[];

  protected getNodeConfig(node: NodeModel): NodeConfig | undefined {
    return (node.addInfo as any)?.nodeConfig;
  }

  protected updateExecutionContext(node: NodeModel, context: ExecutionContext, data: any): void {
    if (node.id) {
      context.results[node.id] = data;
    }
  }
}

export class ClientSideNodeExecutor extends BaseNodeExecutor {
  executeNode(node: NodeModel, context: ExecutionContext): Promise<NodeExecutionResult> {
    const nodeConfig = this.getNodeConfig(node);
    if (!nodeConfig) {
      return Promise.reject({ success: false, error: 'Invalid node configuration' });
    }

    // Execute node logic based on type
    return this.executeClientSideLogic(nodeConfig, context)
      .then(result => {
        this.updateExecutionContext(node, context, result.data);
        return result;
      });
  }

  protected getSupportedNodeTypes(): string[] {
    // Return all node types that are not server-executed
    return getClientExecutedNodes();
  }

  private async executeClientSideLogic(nodeConfig: NodeConfig, context: ExecutionContext): Promise<NodeExecutionResult> {
    // Add a small delay to simulate processing
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    switch (nodeConfig.nodeType) {
      case 'If Condition':
        return this.executeConditionNode(nodeConfig, context);

      case 'Switch Case':
        return this.executeSwitchNode(nodeConfig, context);

      case 'Filter':
        return this.executeFilterNode(nodeConfig, context);

      case 'Manual Click':
        // Handle manual trigger node
        return {
          success: true,
          data: {
            triggered: true,
            triggeredAt: new Date().toISOString(),
            inputContext: context.variables
          }
        };

      default:
        return { success: false, error: `Unsupported node type: ${nodeConfig.nodeType}` };
    }
  }

  private async executeConditionNode(nodeConfig: NodeConfig, context: ExecutionContext): Promise<NodeExecutionResult> {
    try {
      // For now, mock the condition evaluation
      const mockResult = Math.random() > 0.5;
      return {
        success: true,
        data: {
          condition: mockResult,
          evaluatedAt: new Date().toISOString(),
          description: `Condition evaluated to ${mockResult}`,
          mockData: {
            input: context.variables,
            condition: "value > 10", // Mock condition
            result: mockResult
          }
        }
      };
    } catch (error) {
      return { success: false, error: `Condition evaluation failed: ${error}` };
    }
  }

  private async executeSwitchNode(nodeConfig: NodeConfig, context: ExecutionContext): Promise<NodeExecutionResult> {
    try {
      const expression = nodeConfig.settings?.general?.expression;
      if (!expression) {
        return { success: false, error: 'No switch expression specified' };
      }

      const expressionFn = new Function('context', `return ${expression}`);
      const result = expressionFn(context);
      return { success: true, data: { value: result } };
    } catch (error) {
      return { success: false, error: `Switch evaluation failed: ${error}` };
    }
  }

  private async executeFilterNode(nodeConfig: NodeConfig, context: ExecutionContext): Promise<NodeExecutionResult> {
    try {
      const condition = nodeConfig.settings?.general?.filterCondition;
      if (!condition) {
        return { success: false, error: 'No filter condition specified' };
      }

      const filterFn = new Function('item', 'context', `return ${condition}`);
      const input = nodeConfig.settings?.general?.input || [];
      const filtered: any[] = (input as any[]).filter((item: any) => filterFn(item, context));

      return { success: true, data: { filtered } };
    } catch (error) {
      return { success: false, error: `Filter execution failed: ${error}` };
    }
  }
}