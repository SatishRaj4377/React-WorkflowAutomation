import React, { useState } from 'react';
import { AppBarComponent } from '@syncfusion/ej2-react-navigations';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { DropDownButtonComponent } from '@syncfusion/ej2-react-splitbuttons';
import './AppBar.css';

interface AppBarProps {
  projectName?: string;
  onBack?: () => void;
  onSave?: () => void;
  onProjectNameChange?: (name: string) => void;
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
  showBackButton?: boolean;
}

const AppBar: React.FC<AppBarProps> = ({
  projectName = 'Untitled Workflow',
  onBack,
  onSave,
  onProjectNameChange,
  theme,
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

  const settingsMenuItems = [
    { id: 'theme', text: `Switch to ${theme === 'light' ? 'Dark' : 'Light'} Theme`, iconCss: 'e-icons e-palette' },
    { id: 'settings', text: 'Settings', iconCss: 'e-icons e-settings' },
    { id: 'help', text: 'Help & Support', iconCss: 'e-icons e-help' },
    { id: 'about', text: 'About', iconCss: 'e-icons e-info' }
  ];

  const handleMenuClick = (args: any) => {
    switch (args.item.id) {
      case 'theme':
        onThemeToggle();
        break;
      case 'settings':
        console.log('Settings clicked');
        break;
      case 'help':
        console.log('Help clicked');
        break;
      case 'about':
        console.log('About clicked');
        break;
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
              <span className="edit-icon">✏️</span>
            </h1>
          )}
        </div>
      </div>

      <div className="e-appbar-spacer"></div>

      <div className="appbar-right">
        {onSave && (
          <ButtonComponent
            cssClass="e-inherit save-button"
            iconCss="e-icons e-save-icon"
            content="Save"
            onClick={onSave}
            isPrimary
            title="Save Workflow"
          />
        )}
        
        <div className="settings-dropdown">
          <ButtonComponent
            cssClass="e-inherit settings-trigger"
            iconCss="e-icons e-settings"
            title="Settings"
          />
          <DropDownButtonComponent
            items={settingsMenuItems}
            select={handleMenuClick}
            cssClass="settings-menu"
          />
        </div>

        <div className="user-profile">
          <ButtonComponent
            cssClass="e-inherit user-avatar"
            iconCss="e-icons e-user"
            title="User Profile"
          />
        </div>
      </div>
    </AppBarComponent>
  );
};

export default AppBar;