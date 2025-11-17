import { NodeModel } from '@syncfusion/ej2-react-diagrams';
import { ExecutionContext, NodeConfig, NodeExecutionResult } from '../../types';
import { showErrorToast } from '../../components/Toast';

// Trigger category executor handles nodes like Chat, Manual Click
export async function executeTriggerCategory(
  _node: NodeModel,
  nodeConfig: NodeConfig,
  context: ExecutionContext
): Promise<NodeExecutionResult> {
  switch (nodeConfig.nodeType) {
    case 'Chat':
      return executeChatTriggerNode();

    case 'Form':
      return executeFormTriggerNode(nodeConfig);

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

// ---------------- Form Trigger ----------------
async function executeFormTriggerNode(nodeConfig: NodeConfig): Promise<NodeExecutionResult> {
  try {
    const title = ((nodeConfig.settings as any)?.general?.formTitle ?? '').trim();
    const description = (nodeConfig.settings as any)?.general?.formDescription ?? '';
    const fields = Array.isArray((nodeConfig.settings as any)?.general?.formFields)
      ? (nodeConfig.settings as any).general.formFields
      : [];

    // Validate configuration before opening
    const invalid = !title || fields.length === 0 || fields.some((f: any) => {
      if (!f || !f.type) return true;
      if (!f.label || String(f.label).trim() === '') return true;
      if (f.type === 'dropdown') {
        const opts = Array.isArray(f.options) ? f.options.filter((o: any) => String(o).trim() !== '') : [];
        if (opts.length === 0) return true;
      }
      return false;
    });
    if (invalid) {
      const msg = 'Form trigger misconfigured. Ensure title and valid fields (labels, options for dropdowns) are set.';
      showErrorToast('Form Trigger Configuration', msg);
      return { success: false, error: msg };
    }

    const waitForSubmit = () =>
      new Promise<{ values: string[]; at: string }>((resolve, reject) => {
        const onSubmitted = (e: Event) => {
          const ce = e as CustomEvent<{ values?: string[]; at?: string }>;
          const vals = Array.isArray(ce.detail?.values) ? ce.detail!.values : [];
          cleanup();
          resolve({ values: vals, at: ce.detail?.at || new Date().toISOString() });
        };
        const onCancel = () => {
          const err = new Error('Form trigger cancelled');
          cleanup(err);
        };
        const cleanup = (err?: Error) => {
          window.removeEventListener('wf:form:submitted', onSubmitted as EventListener);
          window.removeEventListener('wf:form:cancel', onCancel as EventListener);
          if (err) reject(err);
        };
        window.addEventListener('wf:form:submitted', onSubmitted as EventListener, { once: true });
        window.addEventListener('wf:form:cancel', onCancel as EventListener, { once: true });
      });

    const pending = waitForSubmit();

    // Open the form popup in the Editor
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('wf:form:open', {
          detail: { title, description, fields }
        })
      );
      // show waiting banner
      window.dispatchEvent(new CustomEvent('wf:trigger:waiting', { detail: { type: 'Form' } }));
    }

    const submitted = await pending;

    // signal resume to UI
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('wf:trigger:resumed'));
    }

    // Build output payload
    const valueRows = fields.map((f: any, i: number) => ({
      label: f?.label ?? `field_${i + 1}`,
      type: f?.type ?? 'text',
      value: submitted.values?.[i] ?? ''
    }));
    const byLabel: Record<string, any> = {};
    valueRows.forEach((r: { label: string; value: any }) => { byLabel[slugify(r.label)] = r.value; });

    return {
      success: true,
      data: {
        triggered: true,
        submittedAt: submitted.at,
        title,
        description,
        values: valueRows,
        fields,
        data: byLabel
      }
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Form trigger failed';
    showErrorToast('Form Trigger Error', message);
    return { success: false, error: message };
  }
}

function slugify(s: string): string {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
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