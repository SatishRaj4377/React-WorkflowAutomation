import { DiagramComponent } from '@syncfusion/ej2-react-diagrams';
import { NodeModel } from '@syncfusion/ej2-diagrams';
import { ExecutionContext, NodeConfig, NodeExecutionResult, WorkflowExecutionOptions, WorkflowExecutionStatus } from '../types';
import { findTriggerNodes, findConnectedNodes, updateNodeStatus, resetExecutionStates } from '../helper/workflowExecution';
import { showErrorToast, showSuccessToast } from '../components/Toast';
import { globalExecutorRegistry } from './ExecutorRegistry';
import { ClientSideNodeExecutor } from './BaseExecutors';
import { ServerNodeExecutor } from './ServerNodeExecutor';

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

      // Check if any branch failed
      const success = results.every(result => result);
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

      // Mark success and continue with connected nodes
      updateNodeStatus(this.diagram, node.id, 'success');
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
    const connectedNodes = findConnectedNodes(this.diagram, node.id as string);
    
    for (const nextNode of connectedNodes) {
      await this.checkExecutionCancelled();
      
      const success = await this.executeBranchWithErrorHandling(nextNode);
      if (!success && !this.options.enableDebug) {
        throw new Error('Branch execution failed');
      }
    }
  }

  /**
   * Execute a single node with timeout
   */
  private async executeNodeWithTimeout(node: NodeModel): Promise<NodeExecutionResult> {
    const nodeConfig = this.getNodeConfig(node);
    if (!nodeConfig) {
      return { success: false, error: 'Invalid node configuration' };
    }

    const executor = this.getExecutorForNode(nodeConfig);
    if (!executor) {
      return { success: false, error: `No executor found for node type: ${nodeConfig.nodeType}` };
    }

    try {
      // if a chat trigger then don't set timeout, as we will wait for the node to be triggered by a chat message
      const isChatTrigger = nodeConfig.nodeType === 'Chat';
      const result = isChatTrigger
        ? await executor.executeNode(node, this.executionContext) 
        : await Promise.race([
            executor.executeNode(node, this.executionContext),
            this.createTimeout()
          ]);

      // After successful execution, notify context update
      if (result.success) {
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

  /**
   * Get node configuration
   */
  private getNodeConfig(node: NodeModel): NodeConfig | undefined {
    return (node.addInfo as any)?.nodeConfig;
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