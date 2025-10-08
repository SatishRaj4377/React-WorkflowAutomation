import { NodeModel } from '@syncfusion/ej2-diagrams';
import { ExecutionContext, NodeConfig, NodeExecutionResult, NodeExecutor } from '../types';
import { getClientExecutedNodes } from '../constants/nodeRegistry';
import { showErrorToast } from '../components/Toast';
import { updateNodeStatus } from '../helper/workflowExecution';
import { generateResponse } from '../services/AzureChatService';
import { getConnectedSourceByTargetPort, getConnectedTargetBySourcePort } from '../helper/utilities';

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
    return this.executeClientSideLogic(node, nodeConfig, context)
      .then(result => {
        this.updateExecutionContext(node, context, result.data);
        return result;
      });
  }

  protected getSupportedNodeTypes(): string[] {
    // Return all node types that are not server-executed
    return getClientExecutedNodes();
  }

  private async executeClientSideLogic(node: NodeModel, nodeConfig: NodeConfig, context: ExecutionContext): Promise<NodeExecutionResult> {
    // Add a small delay to simulate processing
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    switch (nodeConfig.nodeType) {
      case 'Chat':
        return this.executeChatTriggerNode(nodeConfig, context);

      case 'AI Agent':
        return this.executeAiAgentNode(node, nodeConfig, context);

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

  private async executeChatTriggerNode(nodeConfig: NodeConfig, context: ExecutionContext): Promise<NodeExecutionResult> {
    try {
      
     // 1) Attach the listener FIRST (so we don't miss the Editor's forwarded message)
     const waitForMessage = () =>
       new Promise<{ text: string; at: string }>((resolve, reject) => {
         const handler = (e: Event) => {
           const ce = e as CustomEvent<{ text?: string; at?: string }>;
           const text = (ce.detail?.text || '').trim();
           if (text.length > 0) {
             cleanup();
             resolve({ text, at: ce.detail?.at || new Date().toISOString() });
           }
         };
         const cleanup = (err?: Error) => {
           window.removeEventListener('wf:chat:message', handler as EventListener);
           if (err) reject(err);
         };
         window.addEventListener('wf:chat:message', handler as EventListener, { once: true });
       });

     const pending = waitForMessage();

     // 2) Open the popup (UX)
     if (typeof window !== 'undefined') {
       window.dispatchEvent(new CustomEvent('wf:chat:open', { detail: { reason: 'chat-trigger' } }));
     }
     // 3) Announce we are ready AFTER listener is attached
     if (typeof window !== 'undefined') {
       window.dispatchEvent(new CustomEvent('wf:chat:ready'));
     }

     const message = await pending;

      return {
        success: true,
        data: {
          triggered: true,
          message,
          triggeredAt: new Date().toISOString(),
        }
      };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Chat trigger failed' };
    }
  }

  private async executeAiAgentNode(
    node: NodeModel,
    nodeConfig: NodeConfig,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const diagram: any = (context as any).diagram;
    const agentId = node.id as string;

    // 1) Validate prompt
    const promptTemplate: string | undefined = nodeConfig.settings?.general?.prompt;
    if (!promptTemplate || !promptTemplate.trim()) {
      const msg = 'AI Agent: Please provide the Prompt.';
      showErrorToast('Missing Prompt', msg);
      return { success: false, error: msg };
    }

    // Resolve template tokens like {{ ... }} using execution context
    const finalPrompt = this.resolveTemplateString(promptTemplate, context).trim();
    if (!finalPrompt) {
      const msg = 'AI Agent: Resolved prompt is empty. Check your expression/variables.';
      showErrorToast('Empty Prompt', msg);
      return { success: false, error: msg };
    }

    // 2) Find connected Azure Chat Model via bottom-left-port
    const azureNode = getConnectedTargetBySourcePort(diagram, agentId, 'bottom-left-port');
    if (!azureNode) {
      const msg = 'AI Agent: Connect an Azure Chat Model node to the bottom-left port.';
      showErrorToast('AI Model Missing', msg);
      return { success: false, error: msg };
    }

    const azureCfg = (azureNode.addInfo as any)?.nodeConfig as NodeConfig | undefined;
    const isAzureChatModel =
      (azureCfg?.nodeType  === 'Azure Chat Model Tool') &&
      (azureCfg?.category === 'tool');
    if (!isAzureChatModel) {
      const msg = 'AI Agent: Please connect an valid AI Chat Model.';
      showErrorToast('Invalid AI Model', msg);
      return { success: false, error: msg };
    }

    // 3) Validate Azure model settings
    const endpoint = azureCfg?.settings?.authentication?.azureEndpoint?.trim();
    const key = azureCfg?.settings?.authentication?.azureApiKey?.trim();
    const deploymentName = azureCfg?.settings?.authentication?.azureDeploymentName?.trim();
    if (!endpoint || !key || !deploymentName) {
      const msg = 'Azure Chat Model: Please provide Endpoint, API Key and Deployment name.';
      showErrorToast('Azure Config Missing', msg);
      return { success: false, error: msg };
    }

    // 4) Placeholder: look for tools via bottom-right-port (we’ll integrate later)
    const toolNode = getConnectedTargetBySourcePort(diagram, agentId, 'bottom-right-port');
    // For now, no-op. Later: fetch/read data; include in prompt or enable tool actions.

    // 5) Curate final message (system + user + future tools context)
    const systemMessage = (nodeConfig.settings?.general?.systemMessage || 'Assistant').toString();
    const composedPrompt =
      `System: ${systemMessage}\n\n` +
      `User: ${finalPrompt}\n\n` +
      (toolNode ? `# Tools: [placeholder for ${((toolNode.addInfo as any)?.nodeConfig?.displayName || 'Tool')}]` : '');

    // 6) Mark Azure node running visually while we call the API
    try {
      updateNodeStatus(diagram, azureNode.id as string, 'running');
    } catch {}

    try {
      // 7) Call Azure
      const { text, raw, temperature } = await generateResponse(composedPrompt, {
        endpoint, key, deploymentName, temperature: Number(nodeConfig.settings?.general?.temperature ?? 0.7) || 0.7
      });

      // 8) Update execution context for Azure model node (responseText, temperature, etc.)
      //    Base class will also set results[agentId] for the agent itself when we return success.
      const azureData = { responseText: text, temperature, raw };
      context.results[azureNode.id as string] = azureData;

      // 9) If Chat Trigger is feeding this agent (left-port), echo assistant response in chat UI
      const leftSourceNode = getConnectedSourceByTargetPort(diagram, agentId, 'left-port');
      const leftCfg = (leftSourceNode?.addInfo as any)?.nodeConfig as NodeConfig | undefined;
      const isChatTrigger = (leftCfg?.nodeType || '').toLowerCase() === 'chat';
      if (isChatTrigger && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('wf:chat:assistant-response', { detail: { text } }));
      }

      // 10) Mark Azure node success
      try { updateNodeStatus(diagram, azureNode.id as string, 'success'); } catch {}

      // 11) Success for AI Agent -> return so Base executor records agent output
      return { success: true, data: { response: text } };

    } catch (err: any) {
      // Mark Azure node error on failure
      try { updateNodeStatus(diagram, azureNode.id as string, 'error'); } catch {}
      const msg = `Azure Chat Model failed: ${err?.message || err}`;
      showErrorToast('AI Agent Execution Failed', msg);
      return { success: false, error: msg };
    }
  }

  /** Replace {{ ... }} tokens by evaluating the expression against ExecutionContext */
  private resolveTemplateString(template: string, context: ExecutionContext): string {
    return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_m, expr) => {
      try {
        // Same pattern you used for Switch/Filter: evaluate with "context"
        const fn = new Function('context', `return (${expr})`);
        const val = fn(context);
        return (val ?? '').toString();
      } catch {
        return ''; // if an expression fails, treat as empty
      }
    });
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