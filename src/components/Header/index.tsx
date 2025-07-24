import React, { useState } from 'react';
import { AppBarComponent } from '@syncfusion/ej2-react-navigations';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import './Header.css';

interface AppBarProps {
  projectName?: string;
  onBack?: () => void;
  onSave?: () => void;
  onProjectNameChange?: (name: string) => void;
  onThemeToggle: () => void;
  showBackButton?: boolean;
}

const AppBar: React.FC<AppBarProps> = ({
  projectName = 'Untitled Workflow',
  onBack,
  onSave,
  onProjectNameChange,
  onThemeToggle,
  showBackButton = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(projectName);

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

  return (
    <AppBarComponent id="workflow-appbar" cssClass="custom-appbar">
      <div className="appbar-left">
        {showBackButton && onBack && (
          <ButtonComponent
            cssClass="e-inherit back-button"
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
              {projectName}
              <span className="e-icons e-edit edit-icon"></span>
            </h1>
          )}
        </div>
      </div>

      <div className="e-appbar-spacer"></div>

      <div className="appbar-right">
        {onSave && (
          <ButtonComponent
            cssClass="e-inherit"
            iconCss="e-icons e-save"
            onClick={onSave}
            title="Save Workflow"
          />
        )}
        
        <div className="settings-dropdown">
            <ButtonComponent
              cssClass="e-inherit"
              iconCss="e-icons e-brightness"
              onClick={onThemeToggle}
              title="Toggle Theme"
          />
        </div>
      </div>
    </AppBarComponent>
  );
};

export default AppBar;