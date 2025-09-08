import React, { useState } from 'react';
import { AppBarComponent } from '@syncfusion/ej2-react-navigations';
import { ButtonComponent, SwitchComponent } from '@syncfusion/ej2-react-buttons';
import { DialogComponent, TooltipComponent } from '@syncfusion/ej2-react-popups';
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';
import { DropDownButtonComponent, ItemModel } from '@syncfusion/ej2-react-splitbuttons';
import { DiagramSettings } from '../../types';
import './Header.css';

interface AppBarProps {
  projectName?: string;
  onBack?: () => void;
  onSave?: () => void;
  enableSaveBtn?: boolean;
  onProjectNameChange?: (name: string) => void;
  diagramSettings?: DiagramSettings;
  onDiagramSettingsChange?: (settings: DiagramSettings) => void;
  onExport?: () => void;
  onImport?: (projectData: any) => void;
}

const AppBar: React.FC<AppBarProps> = ({
  projectName = 'Untitled Workflow',
  onBack,
  onSave,
  enableSaveBtn,
  onProjectNameChange,
  diagramSettings = {
    gridStyle: 'dotted',
    enableSnapping: false,
    showOverview: true
  },
  onExport,
  onImport,
  onDiagramSettingsChange,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(projectName);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);

  const settingsDropdownItems: ItemModel[] = [
    { text: 'Import', iconCss:'e-icons e-import' },
    { text: 'Export', iconCss:'e-icons e-export' },
    { separator: true },
    { text: 'Settings', iconCss:'e-icons e-settings'},
  ];

  const handleExport = () => {
    if (onExport) {
      onExport();
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const projectData = JSON.parse(e.target?.result as string);
            if (onImport) {
              onImport(projectData);
            }
          } catch (error) {
            console.error('Error parsing JSON file:', error);
            alert('Invalid JSON file. Please select a valid project file.');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleSettingsDropdownSelect = (args: any) => {
    switch (args.item.text) {
      case 'Settings':
        setIsSettingsDialogOpen(true);
        break;
      case 'Export':
        handleExport();
        break;
      case 'Import':
        handleImport();
        break;
    }
  };

  const handleProjectNameEdit = () => {
    setIsEditing(true);
    setEditValue(projectName);
  };

  const handleProjectNameSave = () => {
    if (onProjectNameChange && editValue.trim()) {
      onProjectNameChange(editValue.trim());
    }
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleProjectNameSave();
    } else if (e.key === 'Escape') {
      setEditValue(projectName);
      setIsEditing(false);
    }
  };

  const handleSettingsChange = (key: keyof DiagramSettings, value: any) => {
    if (onDiagramSettingsChange) {
      const newSettings = { ...diagramSettings, [key]: value };
      onDiagramSettingsChange(newSettings);
    }
  };

  const gridStyleOptions = [
    { text: 'Lines', value: 'lines' },
    { text: 'Dotted', value: 'dotted' },
    { text: 'None', value: 'none' }
  ];

  return (
    <AppBarComponent id="workflow-appbar" cssClass="custom-appbar">
      <div className="appbar-left">
        {onBack && (
          <ButtonComponent
            cssClass="back-button"
            iconCss="e-icons e-arrow-left"
            onClick={onBack}
            title="Back to Home"
          />
        )}
        
        <div className="project-name-section">
          {isEditing ? (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleProjectNameSave}
              onKeyDown={handleKeyPress}
              className="project-name-input"
              autoFocus
              placeholder="Enter project name"
            />
          ) : (
            <h1 className="project-name" onClick={handleProjectNameEdit} title="Click to edit">
              <span className="project-name-text">{projectName}</span>
              <span className="e-icons e-edit edit-icon"></span>
            </h1>
          )}
        </div>
      </div>

      <div className="e-appbar-spacer"></div>

      <div className="appbar-right">
        {onSave && (
          <TooltipComponent content={enableSaveBtn ? "Save Workflow (Ctrl+S)" : "Workflow Saved"}>
            <ButtonComponent
              onClick={onSave}
              className='header-btn save-btn'
              disabled= {!enableSaveBtn}
              content={enableSaveBtn ? 'Save' : 'Saved'}
            />
          </TooltipComponent>
        )}
        <DropDownButtonComponent
          items={settingsDropdownItems}
          select={handleSettingsDropdownSelect}
          iconCss="e-icons e-more-horizontal-1"
          cssClass="header-btn e-caret-hide more-btn"
        />
      </div>

      {/* Settings Dialog */}
      <DialogComponent
        id="settings-dialog"
        header="Diagram Settings"
        visible={isSettingsDialogOpen}
        showCloseIcon={true}
        close={() => setIsSettingsDialogOpen(false)}
        overlayClick={() => setIsSettingsDialogOpen(false)}
        width="480px"
        height="auto"
        target={document.body}
        isModal={true}
        cssClass="settings-dialog-container"
        animationSettings={{ effect: 'None' }}
      >
        <div className="settings-dialog-content">
          <div className="settings-section">
            <h3 className="settings-section-title">Grid & Snapping</h3>
            
            <div className="settings-item">
              <label className="settings-label">Grid Style</label>
              <DropDownListComponent
                dataSource={gridStyleOptions}
                fields={{ text: 'text', value: 'value' }}
                value={diagramSettings.gridStyle}
                change={(args: any) => handleSettingsChange('gridStyle', args.value)}
                width="150px"
                cssClass="settings-dropdown"
              />
            </div>

            <div className="settings-item">
              <label className="settings-label">Enable Snapping</label>
              <SwitchComponent
                checked={diagramSettings.enableSnapping}
                change={(args) => handleSettingsChange('enableSnapping', args.checked)}
                cssClass="settings-switch"
              />
            </div>
          </div>

          <div className="settings-section">
            <h3 className="settings-section-title">Display</h3>
            
            <div className="settings-item">
              <label className="settings-label">Show Overview Panel</label>
              <SwitchComponent
                checked={diagramSettings.showOverview}
                change={(args) => handleSettingsChange('showOverview', args.checked)}
                cssClass="settings-switch"
              />
            </div>

          </div>
        </div>
      </DialogComponent>
    </AppBarComponent>
  );
};

export default AppBar;