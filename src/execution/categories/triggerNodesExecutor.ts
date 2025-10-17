import { NodeModel } from '@syncfusion/ej2-react-diagrams';
import { ExecutionContext, NodeConfig, NodeExecutionResult } from '../../types';

// Trigger category executor handles nodes like Chat, Manual Click
export async function executeTriggerCategory(
  _node: NodeModel,
  nodeConfig: NodeConfig,
  context: ExecutionContext
): Promise<NodeExecutionResult> {
  switch (nodeConfig.nodeType) {
    case 'Chat':
      return executeChatTriggerNode();

    case 'Manual Click':
      return {
        success: true,
        data: {
          triggered: true,
          triggeredAt: new Date().toISOString(),
          inputContext: context.variables
        }
      };

    default:
      return { success: false, error: `Unsupported trigger node type: ${nodeConfig.nodeType}` };
  }
}

// ---------------- Chat Trigger ----------------
async function executeChatTriggerNode(): Promise<NodeExecutionResult> {
  try {
    // 1) Attach the listener FIRST (so we don't miss the Editor's forwarded message)
    const waitForMessage = () =>
      new Promise<{ text: string; at: string }>((resolve, reject) => {
        const onMessage = (e: Event) => {
          const ce = e as CustomEvent<{ text?: string; at?: string }>;
          const text = (ce.detail?.text || '').trim();
          if (text.length > 0) {
            cleanup();
            resolve({ text, at: ce.detail?.at || new Date().toISOString() });
          }
        };
        const onCancel = () => {
          const err = new Error('Chat trigger cancelled');
          cleanup(err);
        };
        const cleanup = (err?: Error) => {
          window.removeEventListener('wf:chat:message', onMessage as EventListener);
          window.removeEventListener('wf:chat:cancel', onCancel as EventListener);
          if (err) reject(err);
        };
        window.addEventListener('wf:chat:message', onMessage as EventListener, { once: true });
        window.addEventListener('wf:chat:cancel', onCancel as EventListener, { once: true });
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