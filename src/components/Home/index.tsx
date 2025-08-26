import React, { useState, useMemo, useRef } from 'react';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { TextBoxComponent } from '@syncfusion/ej2-react-inputs';
import { DropDownButtonComponent } from '@syncfusion/ej2-react-splitbuttons';
import { ListViewComponent } from '@syncfusion/ej2-react-lists';
import { AppBarComponent } from '@syncfusion/ej2-react-navigations';
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
    <div className="home-layout">
      <AppBarComponent colorMode="Light" className="home-appbar">
        <div className="appbar-left">
          <span className="header-logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18.0004 16.98H12.0104C10.9104 16.98 10.0604 17.92 9.53037 18.88C9.11082 19.6672 8.44016 20.2917 7.62499 20.654C6.80982 21.0163 5.89693 21.0957 5.03144 20.8796C4.16594 20.6635 3.39752 20.1643 2.84831 19.4614C2.29911 18.7584 2.00064 17.8921 2.00037 17C2.01037 16.3 2.20037 15.6 2.57037 15" stroke="#6B7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M6 17.0002L9.13 11.2202C9.66 10.2502 9.23 9.04018 8.63 8.12018C8.34681 7.66728 8.15721 7.16225 8.07236 6.63489C7.98751 6.10753 8.00915 5.56851 8.13599 5.04965C8.26283 4.53078 8.49231 4.04257 8.81088 3.61383C9.12946 3.18509 9.53068 2.82449 9.99087 2.55332C10.4511 2.28215 10.9609 2.10589 11.4903 2.03495C12.0197 1.96401 12.558 1.99982 13.0733 2.14026C13.5887 2.28071 14.0707 2.52296 14.4909 2.8527C14.9111 3.18245 15.261 3.59301 15.52 4.06018" stroke="#6B7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M12 6L15.13 11.73C15.66 12.7 16.9 13 18 13C19.0609 13 20.0783 13.4214 20.8284 14.1716C21.5786 14.9217 22 15.9391 22 17C22 18.0609 21.5786 19.0783 20.8284 19.8284C20.0783 20.5786 19.0609 21 18 21" stroke="#6B7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
          <span className="header-title">Workflow Automation</span>
        </div>
      </AppBarComponent>
      <aside className="home-sidebar">
        <ButtonComponent
          cssClass="e-primary create-workflow-btn"
          iconCss="e-icons e-plus"
          onClick={onCreateNew}
        >
          Create Workflow
        </ButtonComponent>
        <ListViewComponent
          id="sidebar-nav"
          dataSource={[
            { text: "Dashboard", id: "dashboard", icon: "e-icons e-home" },
            { text: "My Workflows", id: "workflows", icon: "e-icons e-folder" },
            { text: "Templates", id: "templates", icon: "e-icons e-landscape" },
            { text: "Documentation", id: "docs", icon: "e-icons e-file-document" }
          ]}
          fields={{ id: "id", text: "text", iconCss: "icon" }}
          cssClass="sidebar-list"
          showIcon={true}
        />
      </aside>
      <main className="home-main">
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
      </main>
    </div>
  );
};

export default Home;