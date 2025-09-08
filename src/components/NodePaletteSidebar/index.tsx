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
import "./NodePaletteSidebar.css";

import { PortModel } from '@syncfusion/ej2-react-diagrams';
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onAddNode?: (nodeTemplate: NodeTemplate) => void;
  port?: PortModel | null;
}

const NodePaletteSidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  onAddNode,
  port,
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
          iconUrl: "/images/node-icons/webhook.png",
          type: "trigger",
          category: "Triggers",
          description: "Receive HTTP requests from external services",
        },
        {
          id: "schedule-trigger",
          name: "Schedule",
          iconUrl: "/images/node-icons/schedule.png",
          type: "trigger",
          category: "Triggers",
          description: "Trigger workflow on a schedule",
        },
        {
          id: "manual-trigger",
          name: "Manual Click",
          iconUrl: "/images/node-icons/manual.png",
          type: "trigger",
          category: "Triggers",
          description: "When clicked, trigger the workflow",
        },
        {
          id: "chat-trigger",
          name: "Chat Trigger",
          iconUrl: "/images/node-icons/chat.png",
          type: "trigger",
          category: "Triggers",
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
          iconUrl: "/images/node-icons/ai-agent.png",
          type: "action",
          category: "Core",
          description: "Use AI agents to process data",
        },
        {
          id: "azure-chat",
          name: "Azure Chat Model",
          iconUrl: "/images/node-icons/azure-chat.png",
          type: "action",
          category: "Core",
          description: "Use Azure OpenAI chat models",
        },
        {
          id: "http-request",
          name: "HTTP Request",
          iconUrl: "/images/node-icons/http.png",
          type: "action",
          category: "Core",
          description: "Make HTTP requests to APIs",
        },
        {
          id: "send-email",
          name: "Send Mail",
          iconUrl: "/images/node-icons/gmail.png",
          type: "action",
          category: "Core",
          description: "Send email notifications",
        },
        {
          id: "sheet",
          name: "Sheets",
          iconUrl: "/images/node-icons/gsheet.png",
          type: "action",
          category: "Core",
          description: "Store and Retrieve data in google sheets",
        },
        {
          id: "telegram",
          name: "Telegram",
          iconUrl: "/images/node-icons/telegram.png",
          type: "action",
          category: "Core",
          description: "Send messages via Telegram",
        },
        {
          id: "calendar",
          name: "Calendar",
          iconUrl: "/images/node-icons/calendar.png",
          type: "action",
          category: "Core",
          description: "Manage calendar events",
        },
        {
          id: "docs",
          name: "Docs",
          iconUrl: "/images/node-icons/docs.png",
          type: "action",
          category: "Core",
          description: "Google Docs integration",
        },
        {
          id: "twilio",
          name: "Twilio",
          iconUrl: "/images/node-icons/twilio.png",
          type: "action",
          category: "Core",
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
          iconUrl: "/images/node-icons/if.png",
          type: "action",
          category: "Flow",
          description: "Evaluate conditions and branch logic",
        },
        {
          id: "switch-case",
          name: "Switch Case",
          iconUrl: "/images/node-icons/switch.png",
          type: "action",
          category: "Flow",
          description: "Switch between multiple cases based on conditions",
        },
        {
          id: "filter",
          name: "Filter",
          iconUrl: "/images/node-icons/filter.png",
          type: "action",
          category: "Flow",
          description: "Filter data based on criteria",
        },
        {
          id: "delay",
          name: "Delay",
          iconUrl: "/images/node-icons/delay.png",
          type: "action",
          category: "Flow",
          description: "Delay execution for a specified time",
        },
      ],
    }
  ];

  const filteredCategories = nodeCategories
    .map((category) => ({
      ...category,
      nodes: category.nodes.filter((node) => {
        // Hide trigger nodes if connecting from a port
        if (port && node.type === 'trigger') return false;
        return (
          node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          node.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }),
    }))
    .filter((category) => category.nodes.length > 0);

  const handleNodeClick = (nodeTemplate: NodeTemplate) => {
    // Remove icon property if present, ensure iconUrl is used
    const { icon, ...nodeWithoutIcon } = nodeTemplate as any;
    if (onAddNode) {
      onAddNode(nodeWithoutIcon);
    }
  };

  // Create content for each accordion item
  const createCategoryContent = (category: PaletteCategory) => {
    return (
      <div className="category-nodes">
        {category.nodes.map((node) => (
          <div
            key={node.id}
            className="node-item"
            onClick={() => handleNodeClick(node)}
            title={node.description}
          >
            <div className="node-icon">
              {node.iconUrl && (
                <img
                  src={node.iconUrl}
                  alt={node.name}
                  className="node-icon-img"
                />
              )}
            </div>
            <div className="node-info">
              <div className="node-name">{node.name}</div>
              <div className="node-description">{node.description}</div>
            </div>
            <div className={`node-type-badge ${node.type}`}>{node.type}</div>
          </div>
        ))}
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
      className="custom-sidebar"
      width="320px"
      position="Left"
      type="Over"
      isOpen={isOpen}
      closeOnDocumentClick={true}
      close={onClose}
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
