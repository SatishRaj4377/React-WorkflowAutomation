import React from 'react';
import { ToolbarComponent, ItemsDirective, ItemDirective, OverflowOption  } from '@syncfusion/ej2-react-navigations';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import './Toolbar.css';

interface ToolbarProps {
  onAddNode?: () => void;
  onFitToPage?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onAutoAlign?: () => void;
  onAddSticky?: () => void;
  onSearch?: () => void;
  onExecute?: () => void;
  onCancel?: () => void;
  onVersionHistory?: () => void;
  isExecuting?: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({
  onAddNode,
  onFitToPage,
  onZoomIn,
  onZoomOut,
  onAutoAlign,
  onAddSticky,
  onSearch,
  onExecute,
  onCancel,
  onVersionHistory,
  isExecuting = false,
}) => {
  const toolbarItems = [
    {
      prefixIcon: 'e-icons e-plus',
      tooltipText: 'Open Node Palette',
      id: 'add-node',
      click: onAddNode,
      overflow: "Show"
    },
    {
      type: 'Separator'
    },
    {
      prefixIcon: 'e-icons e-frame-hook',
      tooltipText: 'Fit to Page',
      id: 'fit-page',
      click: onFitToPage,
    },
    {
      prefixIcon: 'e-icons e-zoom-in',
      tooltipText: 'Zoom In',
      id: 'zoom-in',
      click: onZoomIn,
    },
    {
      prefixIcon: 'e-icons e-zoom-out',
      tooltipText: 'Zoom Out',
      id: 'zoom-out',
      click: onZoomOut,
    },
    {
      type: 'Separator'
    },
    {
      prefixIcon: 'e-icons e-ai-chat',
      tooltipText: 'Auto-align Layout',
      id: 'auto-align',
      click: onAutoAlign,
      overflow: "Show"
    },
    {
      prefixIcon: 'e-icons e-add-notes',
      tooltipText: 'Add Sticky Note',
      id: 'add-sticky',
      click: onAddSticky,
      overflow: "Show"
    },
    {
      type: 'Separator'
    },
    {
      prefixIcon: 'e-icons e-search',
      tooltipText: 'Search on Board',
      id: 'search',
      click: onSearch,
      overflow: "Show"
    },
    {
      type: 'Separator'
    },
    {
      prefixIcon: 'e-icons e-clock',
      tooltipText: 'Version History',
      id: 'version-history',
      click: onVersionHistory,
      overflow: "Show"
    },
  ];

  return (
    <div className="workflow-toolbar-container">
      <div className="execution-toolbar">
        {!isExecuting ? (
          <ButtonComponent
            cssClass="execute-btn"
            iconCss="e-icons e-play"
            content="Execute"
            onClick={onExecute}
            isPrimary
          />
        ) : (
          <ButtonComponent
            cssClass="cancel-btn"
            iconCss="e-icons e-stop-rectangle"
            content="Cancel"
            onClick={onCancel}
          />
        )}
      </div>
            <div className="main-toolbar">
        <ToolbarComponent
          id="workflow-toolbar"
          cssClass="custom-toolbar"
          height="48px"
          overflowMode="Popup"
        >
          <ItemsDirective>
            {toolbarItems.map((item, index) => (
              <ItemDirective
                key={index}
                prefixIcon={item.prefixIcon}
                tooltipText={item.tooltipText}
                id={item.id}
                type={item.type as any}
                click={item.click}
                overflow={item.overflow as OverflowOption}
              />
            ))}
          </ItemsDirective>
        </ToolbarComponent>
      </div>
    </div>
  );
};

export default Toolbar;