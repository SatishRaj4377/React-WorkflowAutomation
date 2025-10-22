import { DiagramComponent } from '@syncfusion/ej2-react-diagrams';
import { NodeModel } from '@syncfusion/ej2-diagrams';
import { ExecutionContext, NodeConfig, NodeExecutionResult, WorkflowExecutionOptions, WorkflowExecutionStatus } from '../types';
import { findTriggerNodes, findConnectedNodes, updateNodeStatus, resetExecutionStates, findConnectedNodesFromPort, resolveTargetsFromRightPortSafe } from '../helper/workflowExecution';
import { showErrorToast, showSuccessToast } from '../components/Toast';
import { globalExecutorRegistry } from './ExecutorRegistry';
import { ServerNodeExecutor } from './ServerNodeExecutor';
import { ClientSideNodeExecutor } from './ClientSideNodeExecutor';
import { getNodeConfig, isIfConditionNode, isLoopNode, isSwitchNode } from '../helper/utilities';

/**
 * Service for managing workflow execution with support for both client-side
 * and server-side node execution.
 */
export class WorkflowExecutionService {
  private diagram: DiagramComponent;
  private executionStatus: WorkflowExecutionStatus;
  private executionContext: ExecutionContext;
  private options: WorkflowExecutionOptions;
  private abortController: AbortController;

  constructor(diagram: DiagramComponent, options: WorkflowExecutionOptions = {}) {
    this.diagram = diagram;
    this.options = {
      timeout: 30000,
      retryCount: 3,
      retryDelay: 1000,
      enableDebug: false,
      ...options
    };
    this.executionStatus = {
      isExecuting: false,
      executionPath: []
    };
    this.executionContext = {
      variables: {},
      results: {}
    };
    this.abortController = new AbortController();

    // Initialize executors
    this.initializeExecutors();
  }

  /**
   * Initialize and register node executors
   */
  private initializeExecutors() {
    // Register client-side executor for logical operations
    globalExecutorRegistry.registerExecutor('client', new ClientSideNodeExecutor());

    // Register server-side executor for integrations
    const serverExecutor = new ServerNodeExecutor(
      process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001'
    );
    globalExecutorRegistry.registerExecutor('server', serverExecutor);
  }

  /**
   * Start workflow execution from trigger nodes
   */
  async executeWorkflow(): Promise<boolean> {
    try {
      await this.prepareExecution();
      
      const triggerNodes = this.findAndValidateTriggerNodes();
      if (!triggerNodes) return false;

      // Execute each trigger node branch
      const results = await Promise.all(
        triggerNodes.map(node => this.executeBranchWithErrorHandling(node))
      );

      // Check if any branch failed or any node error was recorded
      const allBranchesOk = results.every(result => result);
      const hadError = Boolean(this.executionStatus.error);
      const success = allBranchesOk && !hadError;
      if (success) {
        showSuccessToast('Execution Complete', 'Workflow executed successfully');
      }
      return success;

    } catch (error) {
      this.handleExecutionError(error);
      return false;
    } finally {
      this.cleanupExecution();
    }
  }

  /**
   * Prepare the workflow for execution
   */
  private async prepareExecution() {
    this.resetExecution();
    this.abortController = new AbortController();
    this.executionStatus.isExecuting = true;
    // Allow client executors (AI Agent) to resolve connected nodes/port
    (this.executionContext as any).diagram = this.diagram;

    // Notify UI that a new execution cycle started (clear any previous waiting banners)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('wf:trigger:clear'));
    }
  }

  /**
   * Find and validate trigger nodes
   */
  private findAndValidateTriggerNodes(): NodeModel[] | null {
    const triggerNodes = findTriggerNodes(this.diagram);
    if (triggerNodes.length === 0) {
      showErrorToast('Execution Failed', 'No trigger nodes found in the workflow');
      return null;
    }
    return triggerNodes;
  }

  /**
   * Execute a branch with error handling
   */
  private async executeBranchWithErrorHandling(node: NodeModel): Promise<boolean> {
    try {
      return await this.executeBranch(node);
    } catch (error) {
      console.error(`Branch execution failed at node ${node.id}:`, error);
      if (node.id) {
        updateNodeStatus(this.diagram, node.id, 'error');
      }
      return false;
    }
  }

  /**
   * Execute a branch of the workflow
   */
  private async executeBranch(node: NodeModel): Promise<boolean> {
    if (!node.id) return false;

    try {
      await this.checkExecutionCancelled();
      
      // Update status and track execution
      this.updateNodeExecutionStatus(node.id);

      // Execute the node
      const result = await this.executeNodeWithTimeout(node);
      if (!result.success) {
        throw new Error(result.error || 'Node execution failed');
      }

      const cfg = getNodeConfig(node);
      if (cfg && isIfConditionNode(cfg)) {
        // Read IF result
        const out = (this.executionContext.results as Record<string, any>)[node.id];
        const isTrue = Boolean(out?.conditionResult);
        const portId = isTrue ? 'right-top-port' : 'right-bottom-port';

        // Reset once and then paint only the matched connector
        updateNodeStatus(this.diagram, node.id, 'success', { restrictToSourcePortId: portId });
      } else if (cfg && isSwitchNode(cfg)) {
        const out = (this.executionContext.results as Record<string, any>)[node.id!];
        const portId: string | null = out?.matchedPortId ?? null;
        // Reset once and then paint only the matched connector
        updateNodeStatus(this.diagram, node.id!, 'success', portId ? { restrictToSourcePortId: portId } : undefined);
      } else {
        // Default: Mark success and continue with connected nodes
        updateNodeStatus(this.diagram, node.id, 'success');
      }
      await this.executeConnectedNodes(node);

      return true;
    } catch (error) {
      this.handleNodeError(node.id, error);
      return false;
    }
  }

  /**
   * Execute connected nodes
   */
  private async executeConnectedNodes(node: NodeModel): Promise<void> {
    const nodeConfig = getNodeConfig(node);
    if (!nodeConfig) return;

    if (isLoopNode(nodeConfig)) {
      await this.handleLoopNode(node);
      return;
    }
    if (isIfConditionNode(nodeConfig)) {
      await this.handleIfConditionNode(node);
      return;
    }
    if (isSwitchNode(nodeConfig)) {
      await this.handleSwitchCaseNode(node);
      return;
    }
    await this.handleDefaultTraversal(node);
  }

  /**
   * Execute a single node with timeout
   */
  private async executeNodeWithTimeout(node: NodeModel): Promise<NodeExecutionResult> {
    const nodeConfig = getNodeConfig(node);
    if (!nodeConfig) {
      return { success: false, error: 'Invalid node configuration' };
    }

    const executor = this.getExecutorForNode(nodeConfig);
    if (!executor) {
      return { success: false, error: `No executor found for node type: ${nodeConfig.nodeType}` };
    }

    try {
      // If a trigger that waits for external input (e.g., Chat/Webhook), do not timeout and show waiting banner
      const isWaitingTrigger = nodeConfig.nodeType === 'Chat' || nodeConfig.nodeType === 'Webhook';
      if (isWaitingTrigger && typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('wf:trigger:waiting', { detail: { type: nodeConfig.nodeType } })
        );
      }

      const isChatTrigger = nodeConfig.nodeType === 'Chat';
      const isWebhookTrigger = nodeConfig.nodeType === 'Webhook';

      const result = (isChatTrigger || isWebhookTrigger)
        ? await executor.executeNode(node, this.executionContext)
        : await Promise.race([
            executor.executeNode(node, this.executionContext),
            this.createTimeout()
          ]);

      // After successful execution, notify context update
      if (result.success) {
        // Clear waiting banner once the trigger resumes/completes
        if (isWaitingTrigger && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('wf:trigger:resumed'));
        }
        this.notifyContextUpdate();
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Node execution failed'
      };
    }
  }

  // --- Loop handler: Executes the branch connected to Loop's right port N times (N = items length)
  private async handleLoopNode(node: NodeModel): Promise<void> {
    const nodeId = node.id!;
    const out = (this.executionContext.results as Record<string, any>)[nodeId];
    const items: any[] = Array.isArray(out?.items) ? out.items : [];
    const total = items.length;

    // 1) Update context RIGHT AFTER the loop node executed (default view) — no 'items'
    (this.executionContext.results as any)[nodeId] = {
      currentloopitem: total > 0 ? items[0] : undefined,
      currentLoopIndex: total > 0 ? 0 : null,         // 0-based
      currentLoopIteration: total > 0 ? 1 : null,     // 1-based
      currentLoopCount: total,
      currentLoopNodeId: nodeId,                      // helpful for expressions/debug
    };
    this.notifyContextUpdate();

    // 2) If no items, nothing to execute downstream
    if (total === 0) return;

    // 3) Resolve downstream targets from right-port (robust)
    const targets = resolveTargetsFromRightPortSafe(this.diagram, nodeId);

    // 4) Iterate and publish LIVE frame (still no 'items' in context)
    for (let i = 0; i < total; i++) {
      await this.checkExecutionCancelled();

      const item = items[i];
      (this.executionContext.results as any)[nodeId] = {
        currentloopitem: item,
        currentLoopIndex: i,           // 0-based
        currentLoopIteration: i + 1,   // 1-based
        currentLoopCount: total,
        currentLoopNodeId: nodeId,
        currentLoopIsFirst: i === 0,
        currentLoopIsLast: i === total - 1,
      };
      this.notifyContextUpdate();

      await this.executeTargets(targets);
    }

    // 5) After loop: keep a small default (first item only)
    (this.executionContext.results as any)[nodeId] = {
      currentloopitem: items[0],
      currentLoopIndex: 0,
      currentLoopIteration: 1,
      currentLoopCount: total,
      currentLoopNodeId: nodeId,
    };
    this.notifyContextUpdate();
  }


  // --- IF handler: read outcome and traverse the chosen port only ---
  private async handleIfConditionNode(node: NodeModel): Promise<void> {
    const out = (this.executionContext.results as Record<string, any>)[node.id!];
    const isTrue = Boolean(out?.conditionResult);
    const portId = isTrue ? 'right-top-port' : 'right-bottom-port';

    // Paint only the matched connector visually
    updateNodeStatus(this.diagram, node.id!, 'success', { restrictToSourcePortId: portId });

    // Traverse only that port
    const targets = findConnectedNodesFromPort(this.diagram as any, node.id!, portId);
    await this.executeTargets(targets);
  }

  // --- Switch handler: read matchedPortId and traverse only that port (if any) ---
  private async handleSwitchCaseNode(node: NodeModel): Promise<void> {
    const out = (this.executionContext.results as Record<string, any>)[node.id!];
    const portId: string | null = out?.matchedPortId ?? null;

    updateNodeStatus(this.diagram, node.id!, 'success', portId ? { restrictToSourcePortId: portId } : undefined);

    if (!portId) return; // No match and no default — end branch gracefully
    const targets = findConnectedNodesFromPort(this.diagram as any, node.id!, portId);
    await this.executeTargets(targets);
  }

  // --- Default traversal for non-conditional nodes ---
  private async handleDefaultTraversal(node: NodeModel): Promise<void> {
    updateNodeStatus(this.diagram, node.id!, 'success');
    const targets = findConnectedNodes(this.diagram as any, node.id!);
    await this.executeTargets(targets);
  }

  //  execute next nodes
  private async executeTargets(targets: NodeModel[]): Promise<void> {
    for (const nxt of targets) {
      await this.checkExecutionCancelled();
      const ok = await this.executeBranchWithErrorHandling(nxt);
      if (!ok && !this.options.enableDebug) throw new Error('Branch execution failed');
    }
  }

  /**
   * Get appropriate executor for node type
   */
  private getExecutorForNode(nodeConfig: NodeConfig) {
    const serverExecutor = globalExecutorRegistry.getExecutor('server');
    const clientExecutor = globalExecutorRegistry.getExecutor('client');

    return serverExecutor?.canExecute({ addInfo: { nodeConfig } } as NodeModel)
      ? serverExecutor
      : clientExecutor;
  }

  /**
   * Update node execution status
   */
  private updateNodeExecutionStatus(nodeId: string) {
    updateNodeStatus(this.diagram, nodeId, 'running');
    this.executionStatus.currentNodeId = nodeId;
    this.executionStatus.executionPath.push(nodeId);
  }

  /**
   * Check if execution was cancelled
   */
  private async checkExecutionCancelled() {
    if (this.abortController.signal.aborted) {
      throw new Error('Execution cancelled');
    }
  }

  /**
   * Create execution timeout
   */
  private createTimeout(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Execution timeout'));
      }, this.options.timeout);
    });
  }

  /**
   * Handle node execution error
   */
  private handleNodeError(nodeId: string, error: unknown) {
    console.error(`Error executing node ${nodeId}:`, error);
    updateNodeStatus(this.diagram, nodeId, 'error');
    this.executionStatus.error = error instanceof Error ? error.message : 'Unknown error';
  }

  /**
   * Handle workflow execution error
   */
  private handleExecutionError(error: unknown) {
    console.error('Workflow execution failed:', error);
    showErrorToast(
      'Execution Failed',
      error instanceof Error ? error.message : 'Unknown error occurred'
    );
  }

  /**
   * Clean up after execution
   */
  private cleanupExecution() {
    this.executionStatus.isExecuting = false;
    this.executionStatus.currentNodeId = undefined;
    // Ensure any waiting banner is cleared when execution finishes
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('wf:trigger:clear'));
    }
  }

  /**
   * Reset execution state
   */
  private resetExecution() {
    this.executionStatus = {
      isExecuting: false,
      executionPath: []
    };
    this.executionContext = {
      variables: {},
      results: {}
    };
    resetExecutionStates(this.diagram);
    
    // Notify context reset
    this.notifyContextUpdate();
  }

  /**
   * Get current execution status
   */
  getExecutionStatus(): WorkflowExecutionStatus {
    return { ...this.executionStatus };
  }

  /**
   * Get execution results
   */
  getExecutionContext(): ExecutionContext {
    return { ...this.executionContext };
  }

  /**
   * Subscribe to execution context updates
   */
  private contextUpdateCallbacks: Array<(context: ExecutionContext) => void> = [];

  onExecutionContextUpdate(callback: (context: ExecutionContext) => void): void {
    this.contextUpdateCallbacks.push(callback);
  }

  private notifyContextUpdate(): void {
    const context = this.getExecutionContext();
    this.contextUpdateCallbacks.forEach(callback => callback(context));
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    // Clear all subscriptions
    this.contextUpdateCallbacks = [];
    
    // Stop any ongoing execution
    if (this.executionStatus.isExecuting) {
      this.stopExecution();
    }
  }

  /**
   * Stop the current execution
   */
  stopExecution() {
    if (!this.executionStatus.isExecuting) return;

    this.abortController.abort();
    this.resetNodeStates();
    this.resetConnectorStates();
    
    this.executionStatus.isExecuting = false;
    this.executionStatus.error = 'Execution cancelled by user';
    showErrorToast('Execution Cancelled', 'Workflow execution was cancelled');

    // Clear any waiting banner on cancel
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('wf:trigger:clear'));
    }
  }

  /**
   * Reset node states after stopping
   */
  private resetNodeStates() {
    this.executionStatus.executionPath.forEach(nodeId => {
      updateNodeStatus(this.diagram, nodeId, 'idle');
    });
  }

  /**
   * Reset connector states after stopping
   */
  private resetConnectorStates() {
    this.diagram?.connectors?.forEach(conn => {
      const connectorPath = document.getElementById(`${conn.id}_path`);
      const connectorTargetDecorator = document.getElementById(`${conn.id}_tarDec`);

      if (connectorPath) {
        connectorPath.classList.remove(
          'workflow-connector-success',
          'workflow-connector-error'
        );
      }
      if (connectorTargetDecorator) {
        connectorTargetDecorator.classList.remove(
          'workflow-connector-targetDec-success',
          'workflow-connector-targetDec-error'
        );
      }
    });
  }
}