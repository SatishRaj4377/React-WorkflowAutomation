import { NodeType, NodeCategories, PaletteCategoryLabel, PortConfiguration } from '../types';

export interface NodeRegistryEntry {
  type: NodeType;
  category: NodeCategories;
  paletteCategory: PaletteCategoryLabel;
  isServerExecuted: boolean;
  label: string;
  description: string;
  iconId?: string;
  // ports will be rendered using this schema instead of generic category defaults.
  portConfig?: PortConfiguration;
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
    portConfig: { rightPort: true },
  },
  'Schedule': {
    type: 'Schedule',
    category: 'trigger',
    paletteCategory: 'Triggers',
    isServerExecuted: false,
    label: 'Schedule',
    description: 'Trigger workflow on schedule',
    iconId: 'ScheduleIcon',
    portConfig: { rightPort: true },
  },
  'Manual Click': {
    type: 'Manual Click',
    category: 'trigger',
    paletteCategory: 'Triggers',
    isServerExecuted: false,
    label: 'Manual Click',
    description: 'Trigger workflow manually',
    iconId: 'ManualClickIcon',
    portConfig: { rightPort: true },
  },
  'Chat': {
    type: 'Chat',
    category: 'trigger',
    paletteCategory: 'Triggers',
    isServerExecuted: false,
    label: 'Chat Trigger',
    description: 'Trigger workflow from chat',
    iconId: 'ChatIcon',
    portConfig: { rightPort: true },
  },
  'AI Agent': {
    type: 'AI Agent',
    category: 'ai-agent',
    paletteCategory: 'Core',
    isServerExecuted: false,
    label: 'AI Agent',
    description: 'Process with AI agent',
    iconId: 'AiAgentIcon',
    portConfig: {
      leftPort: true,
      rightPort: true,
      bottomLeftPort: true,
      bottomRightPort: true,
    },
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
  'EmailJS': {
    type: 'EmailJS',
    category: 'action',
    paletteCategory: 'Core',
    isServerExecuted: false,
    label: 'EmailJS',
    description: 'EmailJS integration',
    iconId: 'EmailJSIcon',
  },
  'Gmail': {
    type: 'Gmail',
    category: 'action',
    paletteCategory: 'Core',
    isServerExecuted: false,
    label: 'Gmail',
    description: 'Gmail integration',
    iconId: 'GmailIcon',
  },
  'Google Sheets': {
    type: 'Google Sheets',
    category: 'action',
    paletteCategory: 'Core',
    isServerExecuted: false,
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
    // Two right ports by default for If Condition
    portConfig: { leftPort: true, rightTopPort: true, rightBottomPort: true },
  },
  'Switch Case': {
    type: 'Switch Case',
    category: 'condition',
    paletteCategory: 'Flow',
    isServerExecuted: false,
    label: 'Switch Case',
    description: 'Multiple path branching',
    iconId: 'SwitchConditionIcon',
    // Single right port initially; dynamic ports can be added later
    portConfig: { leftPort: true, rightPort: true },
  },
  'Filter': {
    type: 'Filter',
    category: 'condition',
    paletteCategory: 'Flow',
    isServerExecuted: false,
    label: 'Filter',
    description: 'Filter array items',
    iconId: 'FilterIcon',
    portConfig: { leftPort: true, rightPort: true },
  },
  'Loop': {
    type: 'Loop',
    category: 'condition',
    paletteCategory: 'Flow',
    isServerExecuted: false,
    label: 'Loop',
    description: 'Loop over array items',
    iconId: 'LoopIcon',
    portConfig: { leftPort: true, rightTopPort: true, rightBottomPort: true },
  },
  'Azure Chat Model Tool': {
    type: 'Azure Chat Model Tool',
    category: 'tool',
    paletteCategory: 'Tools',
    isServerExecuted: false,
    label: 'Azure Chat Model',
    description: 'Process with Azure chat model',
    iconId: 'AzureModelIcon',
    portConfig: { topPort: true },
  },
  'HTTP Request Tool': {
    type: 'HTTP Request Tool',
    category: 'tool',
    paletteCategory: 'Tools',
    isServerExecuted: false,
    label: 'HTTP Request',
    description: 'Make HTTP request',
    iconId: 'HttpRequestIcon',
    portConfig: { topPort: true },
  },
  'EmailJS Tool': {
    type: 'EmailJS Tool',
    category: 'tool',
    paletteCategory: 'Tools',
    isServerExecuted: false,
    label: 'EmailJS',
    description: 'Make EmailJS Integration',
    iconId: 'EmailJSIcon',
    portConfig: { topPort: true },
  },
  'Gmail Tool': {
    type: 'Gmail Tool',
    category: 'tool',
    paletteCategory: 'Tools',
    isServerExecuted: true,
    label: 'Gmail',
    description: 'Gmail integration',
    iconId: 'GmailIcon',
    portConfig: { topPort: true },
  },
  'Google Sheets Tool': {
    type: 'Google Sheets Tool',
    category: 'tool',
    paletteCategory: 'Tools',
    isServerExecuted: true,
    label: 'Google Sheets',
    description: 'Google Sheets integration',
    iconId: 'GoogleSheetIcon',
    portConfig: { topPort: true },
  },
  'Google Calendar Tool': {
    type: 'Google Calendar Tool',
    category: 'tool',
    paletteCategory: 'Tools',
    isServerExecuted: true,
    label: 'Google Calendar',
    description: 'Google Calendar integration',
    iconId: 'GoogleCalendarIcon',
    portConfig: { topPort: true },
  },
  'Google Docs Tool': {
    type: 'Google Docs Tool',
    category: 'tool',
    paletteCategory: 'Tools',
    isServerExecuted: true,
    label: 'Google Docs',
    description: 'Google Docs integration',
    iconId: 'GoogleDocsIcon',
    portConfig: { topPort: true },
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