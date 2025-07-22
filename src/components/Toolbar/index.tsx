import React from 'react';
import { ToolbarComponent, ItemsDirective, ItemDirective } from '@syncfusion/ej2-react-navigations';
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
      tooltipText: 'Add Node (Open Node Palette)',
      id: 'add-node',
      click: onAddNode,
    },
    {
      type: 'Separator'
    },
    {
      prefixIcon: 'e-icons e-fit',
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
      prefixIcon: 'e-icons e-table-align-center-edit',
      tooltipText: 'Auto-align Layout',
      id: 'auto-align',
      click: onAutoAlign,
    },
    {
      prefixIcon: 'e-icons e-content',
      tooltipText: 'Add Sticky Note',
      id: 'add-sticky',
      click: onAddSticky,
    },
    {
      type: 'Separator'
    },
    {
      prefixIcon: 'e-icons e-search',
      tooltipText: 'Search on Board',
      id: 'search',
      click: onSearch,
    },
    {
      type: 'Separator'
    },
    {
      prefixIcon: 'e-icons e-history',
      tooltipText: 'Version History',
      id: 'version-history',
      click: onVersionHistory,
    },
  ];

  return (
    <div className="workflow-toolbar-container">
      <div className="main-toolbar">
        <ToolbarComponent
          id="workflow-toolbar"
          cssClass="custom-toolbar"
          height="48px"
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
              />
            ))}
          </ItemsDirective>
        </ToolbarComponent>
      </div>

      <div className="execution-toolbar">
        {!isExecuting ? (
          <ButtonComponent
            cssClass="execute-btn"
            iconCss="e-icons e-play-icon"
            content="Execute"
            onClick={onExecute}
            isPrimary
          />
        ) : (
          <ButtonComponent
            cssClass="cancel-btn"
            iconCss="e-icons e-stop-icon"
            content="Cancel"
            onClick={onCancel}
          />
        )}
      </div>
    </div>
  );
};

export default Toolbar;