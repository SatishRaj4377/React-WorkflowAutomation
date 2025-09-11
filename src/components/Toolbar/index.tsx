import React from 'react';
import { ToolbarComponent, ItemsDirective, ItemDirective, OverflowOption } from '@syncfusion/ej2-react-navigations';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import './Toolbar.css';

interface ToolbarProps {
  onAddNode?: () => void;
  onFitToPage?: () => void;
  onResetZoom?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onAddSticky?: (position: { x: number; y: number }) => void;
  onExecute?: () => void;
  onCancel?: () => void;
  isExecuting?: boolean;
  onTogglePan?: () => void;
  isPanActive?: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({
  onAddNode,
  onFitToPage,
  onResetZoom,
  onZoomIn,
  onZoomOut,
  onAddSticky,
  onExecute,
  onCancel,
  isExecuting = false,
  onTogglePan,
  isPanActive,
}) => {
  // Template for execute button
  const executeButtonTemplate = () => {
    return (
      <ButtonComponent
        cssClass={isExecuting ? 'cancel-btn' : 'execute-btn'}
        iconCss={isExecuting ? 'e-icons e-stop-rectangle' : 'e-icons e-play'}
        content={isExecuting ? 'Cancel' : 'Execute'}
        onClick={isExecuting ? onCancel : onExecute}
        isPrimary={!isExecuting}
      />
    );
  };

  const toolbarItems = [
    {
      prefixIcon: 'e-icons e-plus',
      tooltipText: 'Add Nodes',
      id: 'add-nodes',
      click: onAddNode,
      overflow: 'Show',
    },
    {
      type: 'Separator',
    },
    {
      prefixIcon: 'e-icons e-add-notes',
      tooltipText: 'Add Sticky Note',
      id: 'add-sticky',
      click: onAddSticky,
      overflow: 'Show',
    },
    {
      type: 'Separator',
    },
    {
        prefixIcon: 'e-icons e-pan',
        tooltipText: 'Pan (Spacebar)',
        id: 'pan-tool',
        click: onTogglePan,
        cssClass: isPanActive ? 'e-active' : '',
    },
    {
      type: 'Separator',
    },
    {
      prefixIcon: 'e-icons e-circle-add',
      tooltipText: 'Zoom In',
      id: 'zoom-in',
      click: onZoomIn,
    },
    {
      prefixIcon: 'e-icons e-circle-remove',
      tooltipText: 'Zoom Out',
      id: 'zoom-out',
      click: onZoomOut,
    },
    {
      prefixIcon: 'e-icons e-refresh',
      tooltipText: 'Reset Zoom',
      id: 'reset-zoom',
      click: onResetZoom,
    },
    {
      prefixIcon: 'e-icons e-bring-to-center',
      tooltipText: 'Fit to Page',
      id: 'fit-page',
      click: onFitToPage,
    },
    {
      type: 'Separator'
    },
    {
      template: executeButtonTemplate,
      tooltipText: isExecuting ? 'Cancel Execution' : 'Execute Workflow',
      id: isExecuting ? 'cancel' : 'execute',
      overflow: "Show"
    }

  ];

  return (
    <div className="workflow-toolbar-container">
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
              text={(item as any).text}
              tooltipText={item.tooltipText}
              id={item.id}
              type={item.type as any}
              click={item.click}
              overflow={item.overflow as OverflowOption}
              cssClass={(item as any).cssClass}
              template={item.template}
            />
          ))}
        </ItemsDirective>
      </ToolbarComponent>
    </div>
  );
};

export default Toolbar;
