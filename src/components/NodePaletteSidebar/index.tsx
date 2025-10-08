import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  SidebarComponent,
  AccordionComponent,
  AccordionItemDirective,
  AccordionItemsDirective,
} from "@syncfusion/ej2-react-navigations";
import { ButtonComponent } from "@syncfusion/ej2-react-buttons";
import { TextBoxComponent } from "@syncfusion/ej2-react-inputs";
import { NodeTemplate, PaletteCategory } from "../../types";
import { PortModel } from '@syncfusion/ej2-react-diagrams';
import { getNodesByPaletteCategory } from "../../constants/nodeRegistry";
import {IconRegistry} from "../../assets/icons";
import "./NodePaletteSidebar.css";

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

  const NodeSearchIcon = IconRegistry["NodeSearch"];

  const handleSearchCreated = () => {
    setTimeout(() => {
      if (searchRef.current) {
        searchRef.current.addIcon("prepend", "e-icons e-search search-icon");
      }
    });
  };

  // Get node categories from registry
  const nodeCategories: PaletteCategory[] = useMemo(() => ([
    {
      name: "Triggers",
      collapsed: false,
      nodes: getNodesByPaletteCategory('Triggers').map(node => ({
        id: `${node.type.toLowerCase()}-trigger`,
        name: node.label,
        iconId: node.iconId,
        category: node.category,
        nodeType: node.type,
        description: node.description
      }))
    },
    {
      name: "Core",
      collapsed: true,
      nodes: [
        ...getNodesByPaletteCategory('Core').map(node => ({
          id: node.type.toLowerCase().replace(/\s+/g, '-'),
          name: node.label,
          iconId: node.iconId,
          category: node.category,
          nodeType: node.type,
          description: node.description
        }))
      ]
    },
    {
      name: "Flow",
      collapsed: true,
      nodes: getNodesByPaletteCategory('Flow').map(node => ({
        id: node.type.toLowerCase().replace(/\s+/g, '-'),
        name: node.label,
        iconId: node.iconId,
        category: node.category,
        nodeType: node.type,
        description: node.description
      }))
    },
    {
      name: "Tools",
      collapsed: true,
      nodes: getNodesByPaletteCategory('Tools').map(node => ({
        id: node.type.toLowerCase().replace(/\s+/g, '-'),
        name: node.label,
        iconId: node.iconId,
        category: node.category,
        nodeType: node.type,
        description: node.description
      }))
    }
  ]), []);

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
              <div className="no-results-icon">
                <NodeSearchIcon className="svg-icon"/>
              </div>
              <p>No nodes found matching "{searchTerm}"</p>
            </div>
          ) : null}
        </div>
      </div>
    </SidebarComponent>
  );
};

export default NodePaletteSidebar;
