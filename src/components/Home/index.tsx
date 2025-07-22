import React, { useState } from 'react';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { ProjectData } from '../../types';
import './Home.css';

interface HomeProps {
  projects: ProjectData[];
  onCreateNew: () => void;
  onOpenProject: (project: ProjectData) => void;
  onDeleteProject: (projectId: string) => void;
}

const Home: React.FC<HomeProps> = ({
  projects,
  onCreateNew,
  onOpenProject,
  onDeleteProject
}) => {
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const handleDuplicate = (project: ProjectData, e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement duplicate functionality
    console.log('Duplicate project:', project.name);
  };

  return (
    <div className="home-container">
      <div className="home-header gradient-bg">
        <div className="home-header-content">
          <h1 className="home-title">Workflow Automation Studio</h1>
          <p className="home-subtitle">Build powerful automation workflows with drag-and-drop simplicity</p>
        </div>
      </div>

      <div className="home-content">
        {/* Quick Access Section */}
        <section className="quick-access-section animate-fade-in-up">
          <h2 className="section-title">Quick Start</h2>
          <div className="quick-access-grid">
            <div className="e-card modern-card quick-access-card" onClick={onCreateNew}>
              <div className="e-card-content">
                <div className="quick-access-icon">
                  ✨
                </div>
                <h3>Create Blank Workflow</h3>
                <p>Start with a blank canvas and build your workflow from scratch</p>
              </div>
            </div>

            <div className="e-card modern-card quick-access-card template-card">
              <div className="e-card-content">
                <div className="quick-access-icon">
                  📧
                </div>
                <h3>Email Automation</h3>
                <p>Template for email-based workflows</p>
                <span className="template-badge">Template</span>
              </div>
            </div>

            <div className="e-card modern-card quick-access-card template-card">
              <div className="e-card-content">
                <div className="quick-access-icon">
                  🔄
                </div>
                <h3>Data Processing</h3>
                <p>Process and transform data workflows</p>
                <span className="template-badge">Template</span>
              </div>
            </div>

            <div className="e-card modern-card quick-access-card template-card">
              <div className="e-card-content">
                <div className="quick-access-icon">
                  🌐
                </div>
                <h3>API Integration</h3>
                <p>Connect and integrate with external APIs</p>
                <span className="template-badge">Template</span>
              </div>
            </div>
          </div>
        </section>

        {/* Recent Projects Section */}
        <section className="recent-projects-section animate-fade-in-up">
          <div className="section-header">
            <h2 className="section-title">Recent Projects</h2>
            <div className="view-toggle">
              <ButtonComponent
                cssClass={`view-toggle-btn ${viewMode === 'card' ? 'active' : ''}`}
                onClick={() => setViewMode('card')}
                iconCss="e-icons e-grid-view"
              >
                Card
              </ButtonComponent>
              <ButtonComponent
                cssClass={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                iconCss="e-icons e-list-unordered"
              >
                List
              </ButtonComponent>
            </div>
          </div>

          {projects.length === 0 ? (
            <div className="empty-state animate-fade-in-up">
              <div className="empty-icon">🚀</div>
              <h3>No projects yet</h3>
              <p>Create your first workflow to get started and unlock the power of automation</p>
              <ButtonComponent isPrimary onClick={onCreateNew} cssClass="e-btn">
                ✨ Create New Workflow
              </ButtonComponent>
            </div>
          ) : (
            <div className={`projects-container ${viewMode === 'list' ? 'list-view' : 'card-view'}`}>
              {projects.map((project) => (
                <div
                  key={project.id}
                  className={`e-card modern-card project-card ${viewMode}-item`}
                  onClick={() => onOpenProject(project)}
                >
                  {viewMode === 'card' && project.thumbnail && (
                    <div className="e-card-image project-thumbnail">
                      <img src={project.thumbnail} alt={project.name} />
                    </div>
                  )}
                  
                  <div className="e-card-header">
                    <div className="e-card-header-caption">
                      <div className="e-card-header-title">{project.name}</div>
                      <div className="e-card-sub-title">
                        Modified: {formatDate(project.lastModified)}
                      </div>
                    </div>
                  </div>

                  <div className="e-card-actions">
                    <ButtonComponent
                      cssClass="e-card-btn"
                      iconCss="icon-open"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenProject(project);
                      }}
                    >
                      🚀 Open
                    </ButtonComponent>
                    <ButtonComponent
                      cssClass="e-card-btn"
                      iconCss="icon-duplicate"
                      onClick={(e) => handleDuplicate(project, e)}
                    >
                      📋 Duplicate
                    </ButtonComponent>
                    <ButtonComponent
                      cssClass="e-card-btn danger"
                      iconCss="icon-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteProject(project.id);
                      }}
                    >
                      🗑️ Delete
                    </ButtonComponent>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Home;