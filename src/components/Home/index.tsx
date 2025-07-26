import React, { useState, useMemo, useRef } from 'react';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { TextBoxComponent } from '@syncfusion/ej2-react-inputs';
import { DropDownButtonComponent } from '@syncfusion/ej2-react-splitbuttons';
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
  const searchRef = useRef<TextBoxComponent>(null);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('lastModified');
  const [sortText, setSortText] = useState('Last Modified');

  const sortOptions = [
    { text: 'Last Modified', id: 'lastModified' },
    { text: 'Last Created', id: 'created' },
    { text: 'Name (A-Z)', id: 'nameAsc' },
    { text: 'Name (Z-A)', id: 'nameDesc' }
  ];

  const handleSearchCreated = () => {
    setTimeout(() => {
      if (searchRef.current) {
        searchRef.current.addIcon('prepend', 'e-icons e-search search-icon');
      }
    });
  };

  const handleSortSelect = (args: any) => {
    setSortBy(args.item.id);
    setSortText(args.item.text);
  };

  const filteredAndSortedProjects = useMemo(() => {
    const filteredProjects = projects.filter(project =>
      project.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return filteredProjects.sort((projectA, projectB) => {
      switch (sortBy) {
        case 'lastModified':
          // Use lastModified from ProjectData
          const lastModifiedA = new Date(projectA.lastModified).getTime();
          const lastModifiedB = new Date(projectB.lastModified).getTime();
          return lastModifiedB - lastModifiedA;
          
        case 'created':
          // Use created from WorkflowData metadata
          const createdDateA = projectA.workflowData?.metadata?.created || projectA.lastModified;
          const createdDateB = projectB.workflowData?.metadata?.created || projectB.lastModified;
          const createdTimeA = new Date(createdDateA).getTime();
          const createdTimeB = new Date(createdDateB).getTime();
          return createdTimeB - createdTimeA;
          
        case 'nameAsc':
          return projectA.name.localeCompare(projectB.name);
          
        case 'nameDesc':
          return projectB.name.localeCompare(projectA.name);
          
        default:
          return 0;
      }
    });
  }, [projects, searchTerm, sortBy]);

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
          <div className="section-title-container">
            <h2 className="section-title">Recent Projects</h2>
            <span className="projects-count">
              {filteredAndSortedProjects.length > 0
                && `${filteredAndSortedProjects.length} projects`
              }
            </span>
          </div>
            <div className="section-controls">
                <div className="search-container">
                  <TextBoxComponent
                    ref={searchRef}
                    placeholder="Search projects..."
                    value={searchTerm}
                    change={(args: any) => setSearchTerm(args.value)}
                    cssClass="project-search"
                    showClearButton={true}
                    created={handleSearchCreated}
                  />
                </div>
                <div className="sort-container">
                  <DropDownButtonComponent
                    items={sortOptions}
                    select={handleSortSelect}
                    cssClass="sort-dropdown-btn"
                  >
                    {sortText}
                  </DropDownButtonComponent>
                </div>
              <div className="view-toggle">
                <ButtonComponent
                  cssClass={`view-toggle-btn ${viewMode === 'card' ? 'active' : ''}`}
                  onClick={() => setViewMode('card')}
                  iconCss="e-icons e-grid-view"
                  title="Card View"
                />
                <ButtonComponent
                  cssClass={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                  iconCss="e-icons e-list-unordered"
                  title="List View"
                />
              </div>
            </div>
          </div>

          {filteredAndSortedProjects.length === 0 ? (
            <div className="empty-state animate-fade-in-up">
              <div className="empty-icon">{projects.length === 0 ? '🚀' : '🔍'}</div>
              <h3>{projects.length === 0 ? 'No projects yet' : 'No projects found'}</h3>
              <p>
                {projects.length === 0 
                  ? 'Create your first workflow to get started and unlock the power of automation'
                  : 'Try adjusting your search terms or filters'
                }
              </p>
              {projects.length === 0 && (
                <ButtonComponent onClick={onCreateNew} cssClass="e-btn">
                  ✨ Create New Workflow
                </ButtonComponent>
              )}
            </div>
          ) : (
            <div className={`projects-container ${viewMode === 'list' ? 'list-view' : 'card-view'}`}>
              {filteredAndSortedProjects.map((project) => (
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
                      iconCss="e-icons e-folder-open"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenProject(project);
                      }}
                    >
                      Open
                    </ButtonComponent>
                    <ButtonComponent
                      cssClass="e-card-btn"
                      iconCss="e-icons e-duplicate"
                      onClick={(e) => handleDuplicate(project, e)}
                    >
                      Duplicate
                    </ButtonComponent>
                    <ButtonComponent
                      cssClass="e-card-btn danger"
                      iconCss="e-icons e-trash"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteProject(project.id);
                      }}
                    >
                      Delete
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