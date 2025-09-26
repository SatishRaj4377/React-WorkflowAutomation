import { ItemModel } from "@syncfusion/ej2-react-splitbuttons";
import { templateImages } from "../assets/icons";

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

export const TEMPLATE_CARDS = [
    {
        id: 'email-automation',
        title: 'Email Automation',
        description: 'Template for email-based workflows',
        image: templateImages.EmailAutomationImage,
        category: 'Communication'
    },
    {
        id: 'api-integration',
        title: 'API Integration',
        description: 'Connect and integrate with external APIs',
        image: templateImages.ApiIntegrationImage,
        category: 'Integration'
    },
    {
        id: 'data-processing',
        title: 'Data Processing',
        description: 'Process and transform data workflows',
        image: templateImages.DataProcessingImage,
        category: 'Data'
    },
    {
        id: 'notification-system',
        title: 'Notification System',
        description: 'Automated notification workflows',
        image: templateImages.NotificationSystemImage,
        category: 'Communication'
    }
];

export const MENU_ITEMS = [
    { text: 'Edit', iconCss: 'e-icons e-edit' },
    { text: 'Export Project', iconCss: 'e-icons e-export' },
    { text: 'Delete', iconCss: 'e-icons e-trash' }
];
