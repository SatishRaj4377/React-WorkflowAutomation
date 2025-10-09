import { ItemModel } from "@syncfusion/ej2-react-splitbuttons";
import { templateImages } from "../assets/icons";
import { NodeType, TemplateProjectConfig } from "../types";

export const NODE_MENU = ['editNode', 'delete'];
export const DIAGRAM_MENU = ['addNode', 'addSticky', 'lockWorkflow', 'selectAll'];

export const GRID_STYLE_OPTIONS = [
    { text: 'Lines', value: 'lines' },
    { text: 'Dotted', value: 'dotted' },
    { text: 'None', value: 'none' }
];

export const CONNECTOR_STYLE_OPTIONS = [
    { text: 'Orthogonal', value: 'Orthogonal' },
    { text: 'Bezier', value: 'Bezier' },
    { text: 'Straight', value: 'Straight' }
];

export const SETTINGS_DROPDOWN_ITEMS: ItemModel[] = [
    { text: 'Import', iconCss: 'e-icons e-import' },
    { text: 'Export', iconCss: 'e-icons e-export' },
    { separator: true },
    { text: 'Settings', iconCss: 'e-icons e-settings' },
];

export const SORT_OPTIONS = [
    { text: 'Last Modified', id: 'lastModified' },
    { text: 'Last Created', id: 'created' },
    { text: 'Name (A-Z)', id: 'nameAsc' },
    { text: 'Name (Z-A)', id: 'nameDesc' },
    { text: 'Bookmarked', id: 'bookmarked' }
];

export const SIDEBAR_ITEMS = [
    { text: "Dashboard", id: "dashboard", icon: "e-icons e-home" },
    { text: "My Workflows", id: "workflows", icon: "e-icons e-folder" },
    { text: "Templates", id: "templates", icon: "e-icons e-landscape" },
    { text: "Documentation", id: "docs", icon: "e-icons e-file-document" }
];

export const TEMPLATE_PROJECTS: TemplateProjectConfig[] = [
    {
        id: 'hr-policy-assistant',
        title: 'Real-Time HR Policy Assistant via Chat',
        description: 'Template for real-time HR policy assistant via chat.',
        image: templateImages.HRPolicyAssistantImage,
    },
    {
        id: 'component-usecase-generator',
        title: 'Use Case Generator for Product Strategy',
        description: 'Template for generating use cases for product strategy',
        image: templateImages.UseCaseGeneratorImage,
    },
    {
        id: 'daily-worklog-tracker',
        title: 'Daily Worklog Tracker & Reminder',
        description: 'Template for tracking daily worklogs and sending reminders.',
        image: templateImages.WorklogTrackerImage,
    },
    {
        id: 'user-form-submission-priority',
        title: 'Form Submission → Priority Triage Email',
        description: 'Template for sending priority emails based on form submissions.',
        image: templateImages.FormSubmissionPriorityImage,
    },
    {
        id: 'auto-notify-github-issues',
        title: 'Auto-Notify Team on New GitHub Issues',
        description: 'Template for notify the team on new GitHub issues created.',
        image: templateImages.GithubTemplateImage,
    }
];

export const MENU_ITEMS = [
    { text: 'Edit', iconCss: 'e-icons e-edit' },
    { text: 'Export Project', iconCss: 'e-icons e-export' },
    { text: 'Delete', iconCss: 'e-icons e-trash' }
];

export const NODE_DIMENSIONS = {
  DEFAULT: {
    WIDTH: 80,
    HEIGHT: 80
  },
  AI_AGENT: {
    WIDTH: 160,
    HEIGHT: 80
  },
  STICKY_NOTE: {
    WIDTH: 200,
    HEIGHT: 120,
    MIN_WIDTH: 160,
    MIN_HEIGHT: 80
  }
};

export const PORT_POSITIONS = {
    TOP: { x: 0.5, y: 0 },
    LEFT: { x: -0.04, y: 0.5 }, // Slight left offset to improve connector link visibility
    AI_AGENT_LEFT: { x: -0.02, y: 0.5 }, // Slight left offset to improve connector link visibility
    RIGHT: { x: 1, y: 0.5 },
    RIGHT_TOP: { x: 1, y: 0.3 },
    RIGHT_BOTTOM: { x: 1, y: 0.7 },
    BOTTOM_LEFT: { x: 0.58, y: 1 },
    BOTTOM_MIDDLE: { x: 0.5, y: 1 },
    BOTTOM_RIGHT: { x: 0.85, y: 1 },
};

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
export const TIMEZONES = ['UTC', 'Asia/Kolkata', 'America/New_York', 'Europe/London', 'Asia/Tokyo'];
export const AUTH_NODE_TYPES: NodeType[] = [
  'Gmail',
  'Google Sheets',
  'Google Calendar',
  'Google Docs',
  'Telegram',
  'Twilio',
  'Azure Chat Model Tool',
];
