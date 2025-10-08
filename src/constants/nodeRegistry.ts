import { NodeType, NodeCategories, PaletteCategoryLabel } from '../types/types';

export interface NodeRegistryEntry {
  type: NodeType;
  category: NodeCategories;
  paletteCategory: PaletteCategoryLabel;
  isServerExecuted: boolean;
  label: string;
  description: string;
  iconId?: string;
}

export const NODE_REGISTRY: Record<NodeType, NodeRegistryEntry> = {
  'Webhook': {
    type: 'Webhook',
    category: 'trigger',
    paletteCategory: 'Triggers',
    isServerExecuted: true,
    label: 'Webhook',
    description: 'Trigger workflow on HTTP request',
    iconId: 'WebhookIcon',
  },
  'Schedule': {
    type: 'Schedule',
    category: 'trigger',
    paletteCategory: 'Triggers',
    isServerExecuted: false,
    label: 'Schedule',
    description: 'Trigger workflow on schedule',
    iconId: 'ScheduleIcon',
  },
  'Manual Click': {
    type: 'Manual Click',
    category: 'trigger',
    paletteCategory: 'Triggers',
    isServerExecuted: false,
    label: 'Manual Click',
    description: 'Trigger workflow manually',
    iconId: 'ManualClickIcon',
  },
  'Chat': {
    type: 'Chat',
    category: 'trigger',
    paletteCategory: 'Triggers',
    isServerExecuted: false,
    label: 'Chat Trigger',
    description: 'Trigger workflow from chat',
    iconId: 'ChatIcon',
  },
  'AI Agent': {
    type: 'AI Agent',
    category: 'ai-agent',
    paletteCategory: 'Core',
    isServerExecuted: false,
    label: 'AI Agent',
    description: 'Process with AI agent',
    iconId: 'AiAgentIcon',
  },
  'HTTP Request': {
    type: 'HTTP Request',
    category: 'action',
    paletteCategory: 'Core',
    isServerExecuted: false,
    label: 'HTTP Request',
    description: 'Make HTTP request',
    iconId: 'HttpRequestIcon',
  },
  'Gmail': {
    type: 'Gmail',
    category: 'action',
    paletteCategory: 'Core',
    isServerExecuted: true,
    label: 'Gmail',
    description: 'Gmail integration',
    iconId: 'GmailIcon',
  },
  'Google Sheets': {
    type: 'Google Sheets',
    category: 'action',
    paletteCategory: 'Core',
    isServerExecuted: true,
    label: 'Google Sheets',
    description: 'Google Sheets integration',
    iconId: 'GoogleSheetIcon',
  },
  'Google Calendar': {
    type: 'Google Calendar',
    category: 'action',
    paletteCategory: 'Core',
    isServerExecuted: true,
    label: 'Google Calendar',
    description: 'Google Calendar integration',
    iconId: 'GoogleCalendarIcon',
  },
  'Google Docs': {
    type: 'Google Docs',
    category: 'action',
    paletteCategory: 'Core',
    isServerExecuted: true,
    label: 'Google Docs',
    description: 'Google Docs integration',
    iconId: 'GoogleDocsIcon',
  },
  'Telegram': {
    type: 'Telegram',
    category: 'action',
    paletteCategory: 'Core',
    isServerExecuted: true,
    label: 'Telegram',
    description: 'Telegram integration',
    iconId: 'TelegramIcon',
  },
  'Twilio': {
    type: 'Twilio',
    category: 'action',
    paletteCategory: 'Core',
    isServerExecuted: true,
    label: 'Twilio',
    description: 'Twilio integration',
    iconId: 'TwilioIcon',
  },
  'If Condition': {
    type: 'If Condition',
    category: 'condition',
    paletteCategory: 'Flow',
    isServerExecuted: false,
    label: 'If Condition',
    description: 'Branch based on condition',
    iconId: 'IfConditionIcon',
  },
  'Switch Case': {
    type: 'Switch Case',
    category: 'condition',
    paletteCategory: 'Flow',
    isServerExecuted: false,
    label: 'Switch Case',
    description: 'Multiple path branching',
    iconId: 'SwitchConditionIcon',
  },
  'Filter': {
    type: 'Filter',
    category: 'action',
    paletteCategory: 'Flow',
    isServerExecuted: false,
    label: 'Filter',
    description: 'Filter array items',
    iconId: 'FilterIcon',
  },
  'Azure Chat Model Tool': {
    type: 'Azure Chat Model Tool',
    category: 'tool',
    paletteCategory: 'Tools',
    isServerExecuted: false,
    label: 'Azure Chat Model',
    description: 'Process with Azure chat model',
    iconId: 'AzureModelIcon',
  },
  'Gmail Tool': {
    type: 'Gmail Tool',
    category: 'tool',
    paletteCategory: 'Tools',
    isServerExecuted: true,
    label: 'Gmail',
    description: 'Gmail integration',
    iconId: 'GmailIcon',
  },
  'Google Sheets Tool': {
    type: 'Google Sheets Tool',
    category: 'tool',
    paletteCategory: 'Tools',
    isServerExecuted: true,
    label: 'Google Sheets',
    description: 'Google Sheets integration',
    iconId: 'GoogleSheetIcon',
  },
  'Google Calendar Tool': {
    type: 'Google Calendar Tool',
    category: 'tool',
    paletteCategory: 'Tools',
    isServerExecuted: true,
    label: 'Google Calendar',
    description: 'Google Calendar integration',
    iconId: 'GoogleCalendarIcon',
  },
  'Google Docs Tool': {
    type: 'Google Docs Tool',
    category: 'tool',
    paletteCategory: 'Tools',
    isServerExecuted: true,
    label: 'Google Docs',
    description: 'Google Docs integration',
    iconId: 'GoogleDocsIcon',
  },
};

// Helper functions to get node lists by different criteria
export const getNodesByPaletteCategory = (paletteCategory: PaletteCategoryLabel): NodeRegistryEntry[] => 
  Object.values(NODE_REGISTRY).filter(node => node.paletteCategory === paletteCategory);

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