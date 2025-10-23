import { NodeModel } from '@syncfusion/ej2-react-diagrams';
import {
  ExecutionContext,
  NodeConfig,
  NodeExecutionResult,
  AzureChatConfig,
  AzureTool,
  AgentMessage
} from '../../types';
import { showErrorToast } from '../../components/Toast';
import { resolveTemplate } from '../../helper/expression';
import { getConnectedTargetBySourcePort } from '../../helper/utilities';
import { updateNodeStatus } from '../../helper/workflowExecution';
import {  generateAgentTurn } from '../../services/AzureChatService';
import { executeActionOrToolCategory } from './actionOrToolNodesExecutor';
import { buildToolDescriptors, composeSystemMessageForHtml, forceToolChoiceFromIntent, generateToolCapabilitiesSystem, htmlToPlainText, persistGeneralPatch } from '../../helper/aiAgentUtils';

// ---------- Main executor ----------

export async function executeAiAgentCategory(
  agentNode: NodeModel,
  agentConfig: NodeConfig,
  context: ExecutionContext
): Promise<NodeExecutionResult> {
  const diagram: any = (context as any).diagram;
  const agentNodeId = agentNode.id as string;

  // ---- Validate prompt ----
  const rawPrompt: string | undefined = agentConfig.settings?.general?.prompt;
  if (!rawPrompt || !rawPrompt.trim()) {
    const msg = 'AI Agent: Please provide the Prompt.';
    showErrorToast('Missing Prompt', msg);
    return { success: false, error: msg };
  }
  const userPrompt = resolveTemplate(rawPrompt, { context }).trim();
  if (!userPrompt) {
    const msg = 'AI Agent: Resolved prompt is empty. Check your expression/variables.';
    showErrorToast('Empty Prompt', msg);
    return { success: false, error: msg };
  }

  // ---- Find the Azure Chat Model (left port is mandatory) ----
  const azureModelNode = getConnectedTargetBySourcePort(diagram, agentNodeId, 'bottom-left-port');
  if (!azureModelNode) {
    const msg = 'AI Agent: Connect an Azure Chat Model node to the bottom-left port.';
    showErrorToast('AI Model Missing', msg);
    return { success: false, error: msg };
  }
  const azureCfg = (azureModelNode.addInfo as any)?.nodeConfig as NodeConfig | undefined;
  const endpoint = azureCfg?.settings?.authentication?.azureEndpoint?.trim();
  const key = azureCfg?.settings?.authentication?.azureApiKey?.trim();
  const deploymentName = azureCfg?.settings?.authentication?.azureDeploymentName?.trim();
  if (!endpoint || !key || !deploymentName) {
    const msg = 'Azure Chat Model: Please provide Endpoint, API Key and Deployment name.';
    showErrorToast('Azure Config Missing', msg);
    return { success: false, error: msg };
  }
  const azureModelNodeId = azureModelNode.id as string;

  // ---- Resolve system message & discover tools ----
  const rawSystem = (agentConfig.settings?.general?.systemMessage ?? 'Assistant').toString();
  const systemMessage = composeSystemMessageForHtml(
    resolveTemplate(rawSystem, { context }).trim()
  );

  const toolDescriptors = buildToolDescriptors(diagram, agentNodeId);     // now returns ALL tools
  const azureTools: AzureTool[] = toolDescriptors.map(td => td.toAzureTool());
  const haveTools = azureTools.length > 0;

  const toolsPrimer = generateToolCapabilitiesSystem(toolDescriptors);
  const forcedToolName = forceToolChoiceFromIntent(userPrompt, toolDescriptors);

  // ---- Messages ----
  const messages: AgentMessage[] = [];
  if (systemMessage) messages.push({ role: 'system', content: systemMessage });
  if (haveTools && toolsPrimer) messages.push({ role: 'system', content: toolsPrimer });
  messages.push({ role: 'user', content: userPrompt });

  // ---- Runtime flags ----
  const maxIterations = Math.max(1, Number(agentConfig.settings?.general?.maxIterations ?? 5));
  const temperature = Number(agentConfig.settings?.general?.temperature ?? 0.7);
  const persistAgentInputs = Boolean(agentConfig.settings?.general?.persistAgentInputs ?? true);

  let lastAssistantText = '';
  let finalPlanOrAnswer: any = null;

  // ---- Paint Azure model as running (like your previous version) ----
  try { updateNodeStatus(diagram, azureModelNodeId, 'running'); } catch {}

  try {
    updateNodeStatus(diagram, agentNodeId, 'running');

    for (let i = 1; i <= maxIterations; i++) {
      const opts = haveTools
        ? ({
            tools: azureTools,
            // Prefer letting the model choose:
            toolChoice: 'auto'
            // If you keep a heuristic, consider only setting toolChoice when i === 1 AND you see consistent success.
          } as const)
        : ({} as const);

      const turn = await generateAgentTurn(
        messages,
        { endpoint, key, deploymentName, temperature } as AzureChatConfig,
        opts as any
      );

      const toolCalls = turn.message.tool_calls ?? [];
      const assistantContent = (turn.message.content ?? null);

      if (haveTools && toolCalls.length > 0) {
        // Keep the assistant message that introduced tool_calls
        messages.push({ role: 'assistant', content: assistantContent, tool_calls: toolCalls });

        // Execute each tool call
        for (const call of toolCalls) {
          const fnName = call.function?.name;
          const td = toolDescriptors.find(t => t.toolName === fnName);

          if (!td) {
            messages.push({
              role: 'tool',
              tool_call_id: call.id,
              content: JSON.stringify({ success: false, error: `Unknown tool: ${fnName}` })
            });
            continue;
          }

          // Parse args
          let args: Record<string, any> = {};
          try { args = JSON.parse(call.function?.arguments ?? '{}'); } catch {}

          // Locate node & config
          const toolNode = diagram.getObject(td.toolNodeId) as NodeModel | null;
          const toolCfg  = (toolNode?.addInfo as any)?.nodeConfig as NodeConfig | undefined;
          if (!toolNode || !toolCfg) {
            messages.push({
              role: 'tool',
              tool_call_id: call.id,
              content: JSON.stringify({ success: false, error: 'Tool node missing on canvas' })
            });
            continue;
          }

          // Patch a one-off config with AI args
          const patchedConfig = td.applyArgsToNodeConfig(toolCfg, args);

          // Optionally persist general inputs so manual runs see them
          if (persistAgentInputs) persistGeneralPatch(diagram, toolNode.id as string, patchedConfig);

          // Paint tool node running
          try { updateNodeStatus(diagram, toolNode.id as string, 'running'); } catch {}

          // Execute via shared executor (manual == agent)
          const execResult = await executeActionOrToolCategory(toolNode, patchedConfig, context);

          // Update context for Output tab
          try {
            if (toolNode.id) {
              (context.results as any)[toolNode.id] = execResult.success ? execResult.data : { error: execResult.error };
            }
          } catch { /* ignore */ }

          // Paint tool node result
          try { updateNodeStatus(diagram, toolNode.id as string, execResult.success ? 'success' : 'error'); } catch {}

          // Return tool result to the model
          messages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: JSON.stringify({
              toolNodeId: td.toolNodeId,
              toolName: td.toolName,
              success: execResult.success,
              data: execResult.data ?? null,
              error: execResult.error ?? null
            })
          });
        }

        // Next iteration: let the model synthesize an answer from tool outputs
        continue;
      }

      // No tool calls → treat assistant text as final answer/plan
      lastAssistantText = (assistantContent ?? '').toString().trim();
      if (lastAssistantText) {
        try { finalPlanOrAnswer = JSON.parse(lastAssistantText); }
        catch { finalPlanOrAnswer = lastAssistantText; }
      }
      break;
    }

    // Final output for the Agent node
    const agentOutput =
      typeof finalPlanOrAnswer === 'object' && finalPlanOrAnswer !== null
        ? finalPlanOrAnswer
        : { intent: 'answer', actions: [], missingInfo: [], finalResponse: (finalPlanOrAnswer as string) || '' };

    // Echo final response to chat (if Chat Trigger is present)
    if (agentOutput.finalResponse && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('wf:chat:assistant-response', { detail: { text: agentOutput.finalResponse } }));
    }

    // 2) Plain text for context
    const plainForContext = htmlToPlainText(agentOutput.finalResponse ?? lastAssistantText,);

    // Store under Azure model node
    const responseData = {
      responseText: plainForContext,
      temperature,
      raw: { agentOutput }  // keep your structured payload
    };

    (context.results as any)[azureModelNodeId] = responseData;

    // Paint success on Azure & Agent
    try { updateNodeStatus(diagram, azureModelNodeId, 'success'); } catch {}
    try { updateNodeStatus(diagram, agentNodeId, 'success'); } catch {}

    return { success: true, data: responseData };

  } catch (err: any) {
    // Paint error on Azure & Agent nodes
    try { updateNodeStatus(diagram, azureModelNodeId, 'error'); } catch {}
    try { updateNodeStatus(diagram, agentNodeId, 'error'); } catch {}

    const plainMsg = err?.message ?? String(err);

    // Show toast (existing behavior)
    showErrorToast('AI Agent Execution Failed', plainMsg);

    // Send formatted HTML to chat (if Chat Trigger is connected)
    const htmlMsg = `
      <div style="font-family:Segoe UI, sans-serif; color:#ff0000;">
        <strong>Error:</strong> ${plainMsg}
      </div>
    `;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('wf:chat:assistant-response', { detail: { text: htmlMsg } }));
    }

    // Update execution context with plain text (not HTML)
    (context.results as any)[agentNodeId] = {
      responseText: plainMsg,
      temperature: Number(agentConfig.settings?.general?.temperature ?? 0.7),
      raw: { error: plainMsg }
    };

    return { success: false, error: plainMsg };

  }
}
