import React, { useEffect, useRef, useState } from "react";
import {
  SidebarComponent,
  AccordionComponent,
  AccordionItemDirective,
  AccordionItemsDirective,
} from "@syncfusion/ej2-react-navigations";
import { ButtonComponent } from "@syncfusion/ej2-react-buttons";
import { TextBoxComponent } from "@syncfusion/ej2-react-inputs";
import { NodeTemplate, PaletteCategory } from "../../types";
import {IconRegistry} from "../../assets/icons";
import "./NodePaletteSidebar.css";

import { PortModel } from '@syncfusion/ej2-react-diagrams';
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onAddNode?: (nodeTemplate: NodeTemplate) => void;
  isUserHandleClicked?: PortModel | null;
}

const NodePaletteSidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  onAddNode,
  isUserHandleClicked,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const searchRef = useRef<TextBoxComponent>(null);
  const accordionRef = useRef<AccordionComponent>(null);

  const handleSearchCreated = () => {
    setTimeout(() => {
      if (searchRef.current) {
        searchRef.current.addIcon("prepend", "e-icons e-search search-icon");
      }
    });
  };
  // Sample node templates
  const nodeCategories: PaletteCategory[] = [
    {
      name: "Triggers",
      collapsed: false,
      nodes: [
        {
          id: "webhook-trigger",
          name: "Webhook",
          iconId: "WebhookIcon",
          category: "trigger",
          nodeType: "Webhook",
          description: "Receive HTTP requests from external services",
        },
        {
          id: "schedule-trigger",
          name: "Schedule",
          iconId: "ScheduleIcon",
          category: "trigger",
          nodeType: "Schedule",
          description: "Trigger workflow on a schedule",
        },
        {
          id: "manual-trigger",
          name: "Manual Click",
          iconId: "ManualClickIcon",
          category: "trigger",
          nodeType: "Manual Click",
          description: "When clicked, trigger the workflow",
        },
        {
          id: "chat-trigger",
          name: "Chat Trigger",
          iconId: "ChatIcon",
          category: "trigger",
          nodeType: "Chat",
          description: "Trigger workflow from chat messages",
        },
      ],
    },
    {
      name: "Core",
      collapsed: true,
      nodes: [
        {
          id: "ai-agent",
          name: "AI Agent",
          iconId: "AiAgentIcon",
          category: "action",
          nodeType: "AI Agent",
          description: "Use AI agents to process data",
        },
        {
          id: "azure-chat",
          name: "Azure Chat Model",
          iconId: "AzureModelIcon",
          category: "action",
          nodeType: "Azure Chat Model",
          description: "Use Azure OpenAI chat models",
        },
        {
          id: "http-request",
          name: "HTTP Request",
          iconId: "HttpRequestIcon",
          category: "action",
          nodeType: "HTTP Request",
          description: "Make HTTP requests to APIs",
        },
        {
          id: "send-email",
          name: "GMail",
          iconId: "GmailIcon",
          category: "action",
          nodeType: "Gmail",
          description: "Send email notifications",
        },
        {
          id: "sheet",
          name: "Google Sheets",
          iconId: "GoogleSheetIcon",
          category: "action",
          nodeType: "Google Sheets",
          description: "Store and Retrieve data from google sheets",
        },
        {
          id: "telegram",
          name: "Telegram",
          iconId: "TelegramIcon",
          category: "action",
          nodeType: "Telegram",
          description: "Send messages via Telegram",
        },
        {
          id: "calendar",
          name: "Google Calendar",
          iconId: "GoogleCalendarIcon",
          category: "action",
          nodeType: "Google Calendar",
          description: "Manage calendar events",
        },
        {
          id: "docs",
          name: "Google Docs",
          iconId: "GoogleDocsIcon",
          category: "action",
          nodeType: "Google Docs",
          description: "Google Docs integration",
        },
        {
          id: "twilio",
          name: "Twilio",
          iconId: "TwilioIcon",
          category: "action",
          nodeType: "Twilio",
          description: "Send SMS messages via Twilio",
        },
      ],
    },
    {
      name: "Flow",
      collapsed: true,
      nodes: [
        {
          id: "if-condition",
          name: "If Condition",
          iconId: "IfConditionIcon",
          category: "condition",
          nodeType: "If Condition",
          description: "Evaluate conditions and branch logic",
        },
        {
          id: "switch-case",
          name: "Switch Case",
          iconId: "SwitchConditionIcon",
          category: "condition",
          nodeType: "Switch Case",
          description: "Switch between multiple cases based on conditions",
        },
        {
          id: "filter",
          name: "Filter",
          iconId: "FilterIcon",
          category: "condition",
          nodeType: "Filter",
          description: "Filter data based on criteria",
        },
      ],
    }
  ];

  const filteredCategories = nodeCategories
    .map((category) => ({
      ...category,
      nodes: category.nodes.filter((node) => {
        // Hide trigger nodes if connecting from a port
        if (isUserHandleClicked && node.category === 'trigger') return false;
        return (
          node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          node.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }),
    }))
    .filter((category) => category.nodes.length > 0);

  const handleNodeClick = (nodeTemplate: NodeTemplate) => {
    // Remove icon property if present, ensure icon is used
    const { icon, ...nodeWithoutIcon } = nodeTemplate as any;
    if (onAddNode) {
      onAddNode(nodeWithoutIcon);
    }
  };

  // Create content for each accordion item
  const createCategoryContent = (category: PaletteCategory) => {
    return (
      <div className="category-nodes">
        {category.nodes.map((node: any) => {
          const nodeIconSrc = IconRegistry[node.iconId];
          return (
            <div
              key={node.id}
              className="node-item"
              onClick={() => handleNodeClick(node)}
              title={node.description}
            >
              <div className="node-icon">
                {typeof nodeIconSrc === 'string' && (
                  <img
                    src={nodeIconSrc}
                    alt={node.name}
                    className="node-icon-img"
                    draggable={false}
                  />
                )}
              </div>
              <div className="node-info">
                <div className="node-name">{node.name}</div>
                <div className="node-description">{node.description}</div>
              </div>
              <div className={`node-type-badge ${node.type}`}>{node.type}</div>
            </div>
          );
        })}
      </div>
    );
  };

  // Create header template for each accordion item
  const createCategoryHeader = (category: PaletteCategory) => {
    return () => (
      <div className="accordion-header-content">
        <span className="category-title">{category.name}</span>
      </div>
    );
  };

  // Remove animations from the accordion component
  useEffect(() => {
    if (accordionRef.current) {
      accordionRef.current.animation = {
        expand: { effect: 'None' },
        collapse: { effect: 'None' }
      };
    }
  }, []);


  return (
    <SidebarComponent
      id="node-palette-sidebar"
      className="custom-node-palette"
      width="320px"
      position="Left"
      type="Over"
      isOpen={isOpen}
      close={onClose}
      enableGestures={false}
      target=".editor-content"
    >
      <div className="sidebar-header">
        <h3 className="sidebar-title">Node Palette</h3>
        <ButtonComponent
          cssClass="close-btn"
          iconCss="e-icons e-close"
          onClick={onClose}
        />
      </div>

      <div className="sidebar-content">
        <div className="search-section">
          <TextBoxComponent
            ref={searchRef}
            placeholder="Search nodes..."
            value={searchTerm}
            input={(e: any) => setSearchTerm(e.value)}
            cssClass="search-input"
            showClearButton={true}
            created={handleSearchCreated}
          />
        </div>

        <div className="categories-container">
          {filteredCategories.length > 0 ? (
            <AccordionComponent
              ref={accordionRef}
              className="custom-accordion"
              expandMode="Single"
            >
              <AccordionItemsDirective>
                {filteredCategories.map((category) => (
                  <AccordionItemDirective
                    key={category.name}
                    expanded={!category.collapsed}
                    header={createCategoryHeader(category)}
                    content={() => createCategoryContent(category)}
                  />
                ))}
              </AccordionItemsDirective>
            </AccordionComponent>
          ) : searchTerm ? (
            <div className="no-results">
              <div className="no-results-icon">🔍</div>
              <p>No nodes found matching "{searchTerm}"</p>
            </div>
          ) : null}
        </div>
      </div>
    </SidebarComponent>
  );
};

export default NodePaletteSidebar;
