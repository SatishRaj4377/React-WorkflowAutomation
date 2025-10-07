import { NodeType, NodeCategories } from '../types/types';

export interface NodeRegistryEntry {
  type: NodeType;
  category: NodeCategories;
  isServerExecuted: boolean;
  label: string;
  description: string;
  iconId?: string;
  inputPorts?: number;
  outputPorts?: number;
  defaultConfig?: any;
}

export const NODE_REGISTRY: Record<NodeType, NodeRegistryEntry> = {
  'Webhook': {
    type: 'Webhook',
    category: 'trigger',
    isServerExecuted: true,
    label: 'Webhook',
    description: 'Trigger workflow on HTTP request',
    iconId: 'WebhookIcon',
    outputPorts: 1
  },
  'Schedule': {
    type: 'Schedule',
    category: 'trigger',
    isServerExecuted: false,
    label: 'Schedule',
    description: 'Trigger workflow on schedule',
    iconId: 'ScheduleIcon',
    outputPorts: 1
  },
  'Manual Click': {
    type: 'Manual Click',
    category: 'trigger',
    isServerExecuted: false,
    label: 'Manual Click',
    description: 'Trigger workflow manually',
    iconId: 'ManualClickIcon',
    outputPorts: 1
  },
  'Chat': {
    type: 'Chat',
    category: 'trigger',
    isServerExecuted: false,
    label: 'Chat Trigger',
    description: 'Trigger workflow from chat',
    iconId: 'ChatIcon',
    outputPorts: 1
  },
  'AI Agent': {
    type: 'AI Agent',
    category: 'ai-agent',
    isServerExecuted: true,
    label: 'AI Agent',
    description: 'Process with AI agent',
    iconId: 'AiAgentIcon',
    inputPorts: 1,
    outputPorts: 1
  },
  'Azure Chat Model': {
    type: 'Azure Chat Model',
    category: 'action',
    isServerExecuted: true,
    label: 'Azure Chat Model',
    description: 'Process with Azure chat model',
    iconId: 'AzureModelIcon',
    inputPorts: 1,
    outputPorts: 1
  },
  'HTTP Request': {
    type: 'HTTP Request',
    category: 'action',
    isServerExecuted: true,
    label: 'HTTP Request',
    description: 'Make HTTP request',
    iconId: 'HttpRequestIcon',
    inputPorts: 1,
    outputPorts: 1
  },
  'Gmail': {
    type: 'Gmail',
    category: 'action',
    isServerExecuted: true,
    label: 'Gmail',
    description: 'Gmail integration',
    iconId: 'GmailIcon',
    inputPorts: 1,
    outputPorts: 1
  },
  'Google Sheets': {
    type: 'Google Sheets',
    category: 'action',
    isServerExecuted: true,
    label: 'Google Sheets',
    description: 'Google Sheets integration',
    iconId: 'GoogleSheetIcon',
    inputPorts: 1,
    outputPorts: 1
  },
  'Telegram': {
    type: 'Telegram',
    category: 'action',
    isServerExecuted: true,
    label: 'Telegram',
    description: 'Telegram integration',
    iconId: 'TelegramIcon',
    inputPorts: 1,
    outputPorts: 1
  },
  'Google Calendar': {
    type: 'Google Calendar',
    category: 'action',
    isServerExecuted: true,
    label: 'Google Calendar',
    description: 'Google Calendar integration',
    iconId: 'GoogleCalendarIcon',
    inputPorts: 1,
    outputPorts: 1
  },
  'Google Docs': {
    type: 'Google Docs',
    category: 'action',
    isServerExecuted: true,
    label: 'Google Docs',
    description: 'Google Docs integration',
    iconId: 'GoogleDocsIcon',
    inputPorts: 1,
    outputPorts: 1
  },
  'Twilio': {
    type: 'Twilio',
    category: 'action',
    isServerExecuted: true,
    label: 'Twilio',
    description: 'Twilio integration',
    iconId: 'TwilioIcon',
    inputPorts: 1,
    outputPorts: 1
  },
  'If Condition': {
    type: 'If Condition',
    category: 'condition',
    isServerExecuted: false,
    label: 'If Condition',
    description: 'Branch based on condition',
    iconId: 'IfConditionIcon',
    inputPorts: 1,
    outputPorts: 2
  },
  'Switch Case': {
    type: 'Switch Case',
    category: 'condition',
    isServerExecuted: false,
    label: 'Switch Case',
    description: 'Multiple path branching',
    iconId: 'SwitchConditionIcon',
    inputPorts: 1,
    outputPorts: 3
  },
  'Filter': {
    type: 'Filter',
    category: 'condition',
    isServerExecuted: false,
    label: 'Filter',
    description: 'Filter array items',
    iconId: 'FilterIcon',
    inputPorts: 1,
    outputPorts: 1
  }
};

// Helper functions to get node lists by different criteria
export const getNodesByCategory = (category: NodeCategories): NodeRegistryEntry[] => 
  Object.values(NODE_REGISTRY).filter(node => node.category === category);

export const getServerExecutedNodes = (): NodeType[] =>
  Object.values(NODE_REGISTRY)
    .filter(node => node.isServerExecuted)
    .map(node => node.type);

export const getClientExecutedNodes = (): NodeType[] =>
  Object.values(NODE_REGISTRY)
    .filter(node => !node.isServerExecuted)
    .map(node => node.type);

export const getCategoryNodes = (categories: NodeCategories[]): NodeRegistryEntry[] =>
  Object.values(NODE_REGISTRY).filter(node => categories.includes(node.category));