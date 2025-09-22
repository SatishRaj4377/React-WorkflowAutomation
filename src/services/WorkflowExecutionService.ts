import { DiagramComponent } from '@syncfusion/ej2-react-diagrams';
import { NodeModel } from '@syncfusion/ej2-diagrams';
import { ExecutionContext, NodeExecutionResult, WorkflowExecutionOptions, WorkflowExecutionStatus } from '../types';
import { findTriggerNodes, findConnectedNodes, updateNodeStatus, resetExecutionStates, mockExecuteNode } from '../helper/workflowExecution';
import { showErrorToast, showSuccessToast } from '../components/Toast';

/**
 * Service for managing workflow execution
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
      timeout: 30000, // 30 second default timeout
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
  }

  /**
   * Start workflow execution from trigger nodes
   */
  async executeWorkflow(): Promise<boolean> {
    try {
      // Reset previous execution state and create new abort controller
      this.resetExecution();
      this.abortController = new AbortController();

      // Find trigger nodes
      const triggerNodes = findTriggerNodes(this.diagram);
      if (triggerNodes.length === 0) {
        showErrorToast('Execution Failed', 'No trigger nodes found in the workflow');
        return false;
      }

      this.executionStatus.isExecuting = true;

      // Execute each trigger node and its branches
      for (const triggerNode of triggerNodes) {
        const success = await this.executeBranch(triggerNode);
        if (!success && !this.options.enableDebug) {
          // Stop on first error unless in debug mode
          return false;
        }
      }

      showSuccessToast('Execution Complete', 'Workflow executed successfully');
      return true;
    } catch (error) {
      console.error('Workflow execution failed:', error);
      showErrorToast('Execution Failed', error instanceof Error ? error.message : 'Unknown error occurred');
      return false;
    } finally {
      this.executionStatus.isExecuting = false;
      this.executionStatus.currentNodeId = undefined;
    }
  }

  /**
   * Execute a branch of the workflow starting from a specific node
   */
  private async executeBranch(node: NodeModel): Promise<boolean> {
    if (!node.id) return false;

    try {
      // Check if execution was cancelled
      if (this.abortController.signal.aborted) {
        throw new Error('Execution cancelled');
      }

      // Update node status and track execution
      updateNodeStatus(this.diagram, node.id, 'running');
      this.executionStatus.currentNodeId = node.id;
      this.executionStatus.executionPath.push(node.id);

      // Execute current node with abort signal
      const result = await Promise.race([
        this.executeNodeWithRetry(node),
        new Promise<never>((_, reject) => {
          this.abortController.signal.addEventListener('abort', () => {
            reject(new Error('Execution cancelled'));
          });
        })
      ]);
      
      if (!result.success) {
        updateNodeStatus(this.diagram, node.id, 'error');
        this.executionStatus.error = result.error;
        return false;
      }

      // Mark node as successful
      updateNodeStatus(this.diagram, node.id, 'success');

      // Find and execute connected nodes
      const connectedNodes = findConnectedNodes(this.diagram, node.id);
      for (const nextNode of connectedNodes) {
        if (this.abortController.signal.aborted) {
          throw new Error('Execution cancelled');
        }
        const success = await this.executeBranch(nextNode);
        if (!success && !this.options.enableDebug) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error(`Error executing node ${node.id}:`, error);
      updateNodeStatus(this.diagram, node.id, 'error');
      return false;
    }
  }

  /**
   * Execute a node with retry logic
   */
  private async executeNodeWithRetry(node: NodeModel): Promise<NodeExecutionResult> {
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= this.options.retryCount!; attempt++) {
      try {
        // Execute with timeout
        const result = await Promise.race([
          mockExecuteNode(node, this.executionContext),
          this.createTimeout()
        ]) as NodeExecutionResult;

        if (result.success) {
          return result;
        }
        
        lastError = new Error(result.error);
      } catch (error) {
        lastError = error as Error;
      }

      // Don't delay on last attempt
      if (attempt < this.options.retryCount!) {
        await new Promise(resolve => 
          setTimeout(resolve, this.options.retryDelay)
        );
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Execution failed after retries'
    };
  }

  /**
   * Create a timeout promise
   */
  private createTimeout(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Execution timeout'));
      }, this.options.timeout);
    });
  }

  /**
   * Reset the execution state
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
   * Stop the current execution
   */
  stopExecution() {
    if (this.executionStatus.isExecuting) {
      // Abort any ongoing execution
      this.abortController.abort();
      
      // Reset states of all nodes in current execution path
      this.executionStatus.executionPath.forEach(nodeId => {
        updateNodeStatus(this.diagram, nodeId, 'idle');
      });

      // Reset connector states
      this.diagram?.connectors?.forEach(conn => {
        const connectorPath = document.getElementById(`${conn.id}_path`);
        const connectorTargetDecorator = document.getElementById(`${conn.id}_tarDec`);

        if (connectorPath) {
          connectorPath.classList.remove('workflow-connector-success', 'workflow-connector-error');
        }
        if (connectorTargetDecorator) {
          connectorTargetDecorator.classList.remove('workflow-connector-targetDec-success', 'workflow-connector-targetDec-error');
        }
      });

      this.executionStatus.isExecuting = false;
      this.executionStatus.error = 'Execution cancelled by user';
      showErrorToast('Execution Cancelled', 'Workflow execution was cancelled');
    }
  }
}