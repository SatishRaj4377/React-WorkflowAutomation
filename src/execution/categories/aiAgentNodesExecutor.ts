import { NodeModel } from '@syncfusion/ej2-react-diagrams';
import { ExecutionContext, NodeConfig, NodeExecutionResult } from '../../types';
import { showErrorToast } from '../../components/Toast';
import { getConnectedSourceByTargetPort, getConnectedTargetBySourcePort } from '../../helper/utilities';
import { resolveTemplate } from '../../helper/expression';
import { updateNodeStatus } from '../../helper/workflowExecution';
import { generateResponse } from '../../services/AzureChatService';

export async function executeAiAgentCategory(
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
  const finalPrompt = resolveTemplate(promptTemplate, { context }).trim()
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
    (azureCfg?.nodeType === 'Azure Chat Model Tool') &&
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
  const systemMessageRaw = (nodeConfig.settings?.general?.systemMessage || 'Assistant').toString();
  const finalSystemMessage = resolveTemplate(systemMessageRaw, { context }).trim();
  const composedPrompt =
    `System: ${finalSystemMessage}\n\n` +
    `User: ${finalPrompt}\n\n` +
    (toolNode ? `# Tools: [placeholder for ${(((toolNode.addInfo as any)?.nodeConfig?.displayName) ?? 'Tool')}]` : '');


  // 6) Mark Azure node running visually while we call the API
  try {
    updateNodeStatus(diagram, azureNode.id as string, 'running');
  } catch { }

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
    try { updateNodeStatus(diagram, azureNode.id as string, 'success'); } catch { }

    // 11) Success for AI Agent -> return so Base executor records agent output
    return { success: true, data: { response: text } };

  } catch (err: any) {
    // Mark Azure node error on failure
    try { updateNodeStatus(diagram, azureNode.id as string, 'error'); } catch { }
    const msg = `Azure Chat Model failed: ${err?.message || err}`;
    showErrorToast('AI Agent Execution Failed', msg);
    return { success: false, error: msg };
  }
}
