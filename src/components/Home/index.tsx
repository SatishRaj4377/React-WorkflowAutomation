import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { TooltipComponent } from '@syncfusion/ej2-react-popups';
import { TextBoxComponent } from '@syncfusion/ej2-react-inputs';
import { DropDownButtonComponent, MenuEventArgs } from '@syncfusion/ej2-react-splitbuttons';
import { ListViewComponent, SelectEventArgs } from '@syncfusion/ej2-react-lists';
import { CheckBoxComponent, ChangeEventArgs as CheckBoxChangeEventArgs } from '@syncfusion/ej2-react-buttons';
import { AppBarComponent } from '@syncfusion/ej2-react-navigations';
import { SwitchComponent } from '@syncfusion/ej2-react-buttons';
import ConfirmationDialog from '../ConfirmationDialog';
import { useTheme } from '../../contexts/ThemeContext';
import { ProjectData } from '../../types';
import { IconRegistry, templateImages } from '../../assets/icons';
import WorkflowProjectService from '../../services/WorkflowProjectService'; // Import the service
import './Home.css';

interface HomeProps {
  projects: ProjectData[];
  onCreateNew: () => void;
  onOpenProject: (project: ProjectData) => void;
  onDeleteProject: (projectId: string) => void;
  onMultipleDeleteProjects: (projectIds: string[]) => void;
  onBookmarkToggle?: (projectId: string) => void;
  bookmarkedProjects?: string[];
}

const Home: React.FC<HomeProps> = ({
  projects,
  onCreateNew,
  onOpenProject,
  onDeleteProject,
  onMultipleDeleteProjects,
  onBookmarkToggle,
  bookmarkedProjects = []
}) => {
  const { theme, toggleTheme } = useTheme();
  const searchRef = useRef<TextBoxComponent>(null);
  const sidebarRef = useRef<ListViewComponent>(null);
  const [viewMode, setViewMode] = useState<'card' | 'list'>(() => {
    const savedViewMode = localStorage.getItem('workflow_projects_view_mode');
    return (savedViewMode === 'list' || savedViewMode === 'card') ? savedViewMode : 'card';
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('lastModified');
  const [sortText, setSortText] = useState('Last Modified');
  const [activeSection, setActiveSection] = useState('dashboard');
  const [projectToDelete, setProjectToDelete] = useState<ProjectData | null>(null);
  const [projectsToDelete, setProjectsToDelete] = useState<ProjectData[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [isMultiDeleteConfirmOpen, setMultiDeleteConfirmOpen] = useState(false);

  const WorkflowLogoIcon = IconRegistry['WorkflowLogo'];
  const WorkflowFolderIcon = IconRegistry['WorkflowFolder'];
  const WorkflowFolderSearchIcon = IconRegistry['WorkflowFolderSearch'];

  const sortOptions = [
    { text: 'Last Modified', id: 'lastModified' },
    { text: 'Last Created', id: 'created' },
    { text: 'Name (A-Z)', id: 'nameAsc' },
    { text: 'Name (Z-A)', id: 'nameDesc' },
    { text: 'Bookmarked', id: 'bookmarked' }
  ];

  const sidebarItems = [
    { text: "Dashboard", id: "dashboard", icon: "e-icons e-home" },
    { text: "My Workflows", id: "workflows", icon: "e-icons e-folder" },
    { text: "Templates", id: "templates", icon: "e-icons e-landscape" },
    { text: "Documentation", id: "docs", icon: "e-icons e-file-document" }
  ];

  const templateCards = [
    {
      id: 'email-automation',
      title: 'Email Automation',
      description: 'Template for email-based workflows',
      image: templateImages.EmailAutomationImage,
      category: 'Communication'
    },
    {
      id: 'api-integration',
      title: 'API Integration',
      description: 'Connect and integrate with external APIs',
      image: templateImages.ApiIntegrationImage,
      category: 'Integration'
    },
    {
      id: 'data-processing',
      title: 'Data Processing',
      description: 'Process and transform data workflows',
      image: templateImages.DataProcessingImage,
      category: 'Data'
    },
    {
      id: 'notification-system',
      title: 'Notification System',
      description: 'Automated notification workflows',
      image: templateImages.NotificationSystemImage,
      category: 'Communication'
    }
  ];

  const menuItems = [
    { text: 'Edit', iconCss: 'e-icons e-edit' },
    { text: 'Export Project', iconCss: 'e-icons e-export' },
    { text: 'Delete', iconCss: 'e-icons e-trash' }
  ];

  const handleSearchCreated = () => {
    setTimeout(() => {
      if (searchRef.current) {
        searchRef.current.addIcon('append', 'e-icons e-search search-icon');
      }
    });
  };

  const handleSortSelect = (args: any) => {
    setSortBy(args.item.id);
    setSortText(args.item.text);
  };

  const handleSidebarSelect = (args: SelectEventArgs) => {
    setActiveSection((args.data as any).id);
  };

  const handleMenuSelect = (project: ProjectData) => (args: MenuEventArgs) => {
    switch (args.item.text) {
      case 'Edit':
        onOpenProject(project);
        break;
      case 'Export Project':
        WorkflowProjectService.exportProject(project);
        break;
      case 'Delete':
        setProjectToDelete(project); 
        break;
    }
  };

  const handleBookmarkToggle = useCallback((projectId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Use setTimeout to ensure the UI update happens after the current event cycle
    // This prevents conflicts with other UI elements like dropdowns
    setTimeout(() => {
      if (onBookmarkToggle) {
        onBookmarkToggle(projectId);
      }
    }, 0);
  }, [onBookmarkToggle]);

  const handleConfirmDelete = () => {
    if (projectToDelete) {
      onDeleteProject(projectToDelete.id);
      setProjectToDelete(null);
    }
    if (projectsToDelete.length > 0) {
      onMultipleDeleteProjects(projectsToDelete.map(p => p.id));
      setProjectsToDelete([]);
      setSelectedProjects([]); // Clear selection after deletion
    }
    setMultiDeleteConfirmOpen(false);
  };

  const handleCloseDeleteDialog = () => {
    setProjectToDelete(null);
    setProjectsToDelete([]);
    setMultiDeleteConfirmOpen(false);
  };

  const handleMultiSelectToggle = (project: ProjectData, isChecked: boolean) => {
    if (isChecked) {
      setSelectedProjects(prev => [...prev, project.id]);
    } else {
      setSelectedProjects(prev => prev.filter(id => id !== project.id));
    }
  };

  const handleSelectAll = (isChecked: boolean) => {
    if (isChecked) {
      setSelectedProjects(filteredAndSortedProjects.map(p => p.id));
    } else {
      setSelectedProjects([]);
    }
  };

  const handleDeleteSelected = () => {
    const toDelete = projects.filter(p => selectedProjects.includes(p.id));
    if (toDelete.length > 0) {
      setProjectsToDelete(toDelete);
      setMultiDeleteConfirmOpen(true);
    }
  };

  const handleExportSelected = () => {
    const toExport = projects.filter(p => selectedProjects.includes(p.id));
    if (toExport.length > 0) {
      WorkflowProjectService.exportMultipleProjects(toExport);
    }
  };

  const isBookmarked = useCallback((projectId: string) => bookmarkedProjects.includes(projectId), [bookmarkedProjects]);

  // Generate stable keys that don't cause unnecessary re-renders
  const getProjectKey = useCallback((project: ProjectData, index: number, prefix: string = '') => {
    return `${prefix}${project.id}-${index}`;
  }, []);

  const filteredAndSortedProjects = useMemo(() => {
    let filteredProjects = projects.filter(project =>
      project.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (sortBy === 'bookmarked') {
      // Filter to only bookmarked projects
      filteredProjects = filteredProjects.filter(project => isBookmarked(project.id));
    }

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

        // For 'bookmarked' (handle sort within only bookmarked group)
        case 'bookmarked':
          return new Date(projectB.lastModified).getTime() - new Date(projectA.lastModified).getTime();
        default:
          return 0;
      }
    });
  }, [projects, searchTerm, sortBy, isBookmarked]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  function formatDateForListCell(date: Date|string) {
    const value = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - value.getTime();
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHour = Math.round(diffMin / 60);
    const diffDay = Math.round(diffHour / 24);

    if (diffDay === 0) {
      if (diffHour > 0) return `${diffHour}h ago`;
      if (diffMin > 0) return `${diffMin}m ago`;
      return `Just now`;
    }
    if (diffDay === 1) return 'Yesterday';
    if (diffDay < 7) return `${diffDay}d ago`;
    return value.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); // e.g. "Aug 27"
  }

  // Save view mode to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('workflow_projects_view_mode', viewMode);
  }, [viewMode]);

  // On mount, select the dashboard item
  useEffect(() => {
    if (sidebarRef.current) {
      sidebarRef.current.selectItem({ id: activeSection });
      // Scroll to top area of the page
      document.querySelector('.home-main')?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeSection]);

  return (
    <div className="home-layout">
      <AppBarComponent colorMode="Light" className="home-appbar">
        <div className="appbar-left">
          <span className="header-logo">
            <WorkflowLogoIcon className="svg-icon"/>
          </span>
          <span className="header-title">Workflow Automation</span>
        </div>
        
        <div className="e-appbar-spacer"></div>
        
        <div className="appbar-right">
          <TooltipComponent content={`Toggle to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
            <SwitchComponent
              checked={theme === 'dark'}
              change={() => toggleTheme()}
              cssClass={`theme-toggle-switch ${theme}`}
              />
          </TooltipComponent>
        </div>
      </AppBarComponent>
      <aside className="home-sidebar">
        <ButtonComponent
          cssClass="e-primary action-btn create-workflow-btn"
          iconCss="e-icons e-plus"
          onClick={onCreateNew}
        >
          Create Workflow
        </ButtonComponent>
        <ListViewComponent
          ref={sidebarRef}
          id="sidebar-nav"
          dataSource={sidebarItems}
          fields={{ id: "id", text: "text", iconCss: "icon" }}
          cssClass="sidebar-list"
          showIcon={true}
          select={handleSidebarSelect} 
        />
      </aside>
      <main className="home-main">
        <div className="home-content">
          {activeSection === 'dashboard' && (
            <>
              {/* Quick Access Section */}
              <section className="quick-access-section animate-fade-in-up">
                <h2 className="section-title">Quick Start</h2>
                <div className="quick-access-grid">
                  {templateCards.map((template) => (
                    <div key={template.id} className="e-card modern-card quick-access-card template-card">
                      <div className="e-card-image template-image">
                        {template.image && (
                          <img src={template.image} alt={template.title} />
                        )}
                      </div>
                      <div className="e-card-content">
                        <h3>{template.title}</h3>
                        <p>{template.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Recent Projects Section */}
              {filteredAndSortedProjects.length > 0 && (
                <section className="recent-projects-section animate-fade-in-up">
                  <h2 className="section-title">Recent Workflows</h2>
                  <div className="projects-container list-view">
                    {/* List Header Row */}
                    <div className="project-list-header">
                      <span className="project-col project-icon-header"></span>
                      <span className="project-col project-title-header">Workflow Name</span>
                      <span className="project-col project-date-header">Created</span>
                      <span className="project-col project-date-header">Modified</span>
                      <span className="project-col project-bookmark-header"></span>
                      <span className="project-col project-menu-header"></span>
                    </div>
                    {filteredAndSortedProjects.slice(0, 5).map((project) => (
                      <div
                        key={project.id}
                        className="project-list-item"
                        onClick={() => onOpenProject(project)}
                        tabIndex={0}
                      >
                        <span className="project-col project-icon">
                          <WorkflowFolderIcon className="svg-icon"/>
                        </span>
                        <span title={project.name} className="project-col project-title">{project.name}</span>
                        <span className="project-col project-date">
                          <TooltipComponent content={formatDate(project.workflowData?.metadata?.created || project.lastModified)}>
                            <span className="project-date">
                              {formatDateForListCell(project.workflowData?.metadata?.created || project.lastModified)}
                            </span>
                          </TooltipComponent>
                        </span>
                        <span className="project-col project-date">
                          <TooltipComponent content={formatDate(project.lastModified)}>
                            <span className="project-date">
                              {formatDateForListCell(project.lastModified)}
                            </span>
                          </TooltipComponent>
                        </span>
                        <span className="project-col project-bookmark">
                          <TooltipComponent content={isBookmarked(project.id) ? 'Remove from favorites' : 'Add to favorites'}>
                            <ButtonComponent
                              cssClass="bookmark-btn"
                              iconCss={`e-icons e-star-filled ${isBookmarked(project.id) ? 'star-filled' : ''}`}
                              onClick={(e) => handleBookmarkToggle(project.id, e)}
                              />
                          </TooltipComponent>
                        </span>
                        <span className="project-col project-menu">
                          <DropDownButtonComponent
                            items={menuItems}
                            iconCss="e-icons e-more-vertical-1"
                            cssClass="e-caret-hide project-menu-dropdown"
                            select={handleMenuSelect(project)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </span>
                      </div>
                    ))}
                  </div>
                  {filteredAndSortedProjects.length > 5 && (
                    <div className="show-more-container">
                      <ButtonComponent
                        className="show-more-btn"
                        iconCss='e-icons e-arrow-right'
                        iconPosition='right'
                        onClick={() => {
                          setActiveSection('workflows');
                        }}
                      >
                        Show all workflows 
                      </ButtonComponent>
                    </div>
                  )}
                </section>
              )}
            </>
          )}

          {activeSection === 'workflows' && (
            <section className="workflows-section animate-fade-in-up">
              <div className="section-header">
                <div className="section-title-group">
                  <h2 className="section-title">My Workflows</h2>
                  {filteredAndSortedProjects.length > 0 && (
                    <span className="projects-count">
                      {filteredAndSortedProjects.length} project{filteredAndSortedProjects.length === 1 ? '' : 's'}
                    </span>
                  )}
                </div>
                <div className="tools-row">
                  <TextBoxComponent
                    ref={searchRef}
                    placeholder="Search Workflows"
                    value={searchTerm}
                    input={arg => setSearchTerm(arg.value)}
                    cssClass="project-search"
                    created={handleSearchCreated}
                  />
                  <DropDownButtonComponent
                    items={sortOptions}
                    select={handleSortSelect}
                    cssClass="sort-dropdown-btn"
                  >
                    {sortText}
                  </DropDownButtonComponent>
                  {viewMode === 'list' && selectedProjects.length > 0 && (
                    <>
                      <TooltipComponent content="Export Selected">
                        <ButtonComponent
                          cssClass="e-primary view-toggle-btn"
                          iconCss="e-icons e-export"
                          onClick={handleExportSelected}
                        />
                      </TooltipComponent>
                      <TooltipComponent content="Delete Selected">
                        <ButtonComponent
                          cssClass="e-danger view-toggle-btn"
                          iconCss="e-icons e-trash"
                          onClick={handleDeleteSelected}
                        />
                      </TooltipComponent>
                    </>
                  )}
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
              searchTerm && projects.length > 0 ? (
                <div className="empty-state animate-fade-in-up">
                  <div className="empty-icon">
                    <WorkflowFolderSearchIcon className="svg-icon search-folder"/>
                  </div>
                  <h3>No workflows found</h3>
                  <p>No workflows match your search.</p>
                </div>
              ) : (
                <div className="empty-state animate-fade-in-up">
                  <div className="empty-icon">
                    <WorkflowLogoIcon className="svg-icon"/>
                  </div>
                  <h3>No workflows yet</h3>
                  <p>Create your first workflow to get started and unlock the power of automation</p>
                  <ButtonComponent onClick={onCreateNew} cssClass="e-btn action-btn" iconCss='e-icons e-plus'>
                    Create New Workflow
                  </ButtonComponent>
                </div>
              )
              ) : (
                <div className={`projects-container ${viewMode === 'list' ? 'list-view' : 'card-view'} ${selectedProjects.length > 0 ? 'selection-active' : ''}`}>
                  {viewMode === 'list' ? (
                    <>
                      {/* Table header row */}
                      <div className="project-list-header">
                        <span className="project-col project-icon-header">
                          <CheckBoxComponent
                            cssClass="project-select-all-checkbox"
                            checked={selectedProjects.length === filteredAndSortedProjects.length && filteredAndSortedProjects.length > 0}
                            indeterminate={selectedProjects.length > 0 && selectedProjects.length < filteredAndSortedProjects.length}
                            change={(e: CheckBoxChangeEventArgs) => handleSelectAll(e.checked as boolean)}
                          />
                        </span>
                        <span className="project-col project-title-header">Workflow Name</span>
                        <span className="project-col project-date-header">Created</span>
                        <span className="project-col project-date-header">Modified</span>
                        <span className="project-col project-bookmark-header"></span>
                        <span className="project-col project-menu-header"></span>
                      </div>
                      {filteredAndSortedProjects.map((project, index) => (
                        <div
                          key={getProjectKey(project, index, 'list-')}
                          className={`project-list-item ${selectedProjects.includes(project.id) ? 'selected' : ''}`}
                          onClick={() => onOpenProject(project)}
                          tabIndex={0}
                        >
                          <span className="project-col project-icon" onClick={(e) => e.stopPropagation()}>
                            <CheckBoxComponent
                              cssClass="project-item-checkbox"
                              checked={selectedProjects.includes(project.id)}
                              change={(e: CheckBoxChangeEventArgs) => handleMultiSelectToggle(project, e.checked as boolean)}
                            />
                            <span className="project-item-icon-svg">
                              <WorkflowFolderIcon className="svg-icon"/>
                            </span>
                          </span>
                          <span title={project.name} className="project-col project-title">{project.name}</span>
                          <span className="project-col project-date">
                            <TooltipComponent content={formatDate(project.workflowData?.metadata?.created || project.lastModified)}>
                              <span className="project-date">
                                {formatDateForListCell(project.workflowData?.metadata?.created || project.lastModified)}
                              </span>
                            </TooltipComponent>
                          </span>
                          <span className="project-col project-date">
                            <TooltipComponent content={formatDate(project.lastModified)}>
                              <span className="project-date">
                                {formatDateForListCell(project.lastModified)}
                              </span>
                            </TooltipComponent>
                          </span>
                          <span className="project-col project-bookmark">
                            <ButtonComponent
                              cssClass="bookmark-btn"
                              iconCss={`e-icons e-star-filled ${isBookmarked(project.id) ? 'star-filled' : ''}`}
                              onClick={(e) => handleBookmarkToggle(project.id, e)}
                              title={isBookmarked(project.id) ? 'Remove from favorites' : 'Add to favorites'}
                            />
                          </span>
                          <span className="project-col project-menu">
                            <DropDownButtonComponent
                              items={menuItems}
                              iconCss="e-icons e-more-vertical-1"
                              cssClass="e-caret-hide project-menu-dropdown"
                              select={handleMenuSelect(project)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </span>
                        </div>
                      ))}
                    </>
                  ) : (
                    filteredAndSortedProjects.map((project, index) => (
                      <div
                        key={getProjectKey(project, index, 'card-')}
                        className={`e-card modern-card project-card card-item`}
                        onClick={() => onOpenProject(project)}
                      >
                        <div className="e-card-image project-thumbnail">
                          <img src={project.thumbnail || templateImages.DefaultImageImage} alt={project.name} />
                          <div className="project-card-overlay">
                            <DropDownButtonComponent
                              items={menuItems}
                              iconCss="e-icons e-more-vertical-1"
                              cssClass="e-caret-hide project-menu-dropdown"
                              select={handleMenuSelect(project)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        <div className="e-card-content">
                          <div className="project-info">
                            <h3 title={project.name} className="project-title">{project.name}</h3>
                            <p className="project-modified">
                              Modified: {formatDate(project.lastModified)}
                            </p>
                          </div>
                          <div className="project-bookmark-card">
                            <ButtonComponent
                              cssClass="bookmark-btn-card"
                              iconCss={`e-icons e-star-filled ${isBookmarked(project.id) ? 'star-filled' : ''}`}
                              onClick={(e) => handleBookmarkToggle(project.id, e)}
                              title={isBookmarked(project.id) ? 'Remove from favorites' : 'Add to favorites'}
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </section>
          )}

          {activeSection === 'templates' && (
            <section className="animate-fade-in-up">
              <h2 className="section-title">Templates</h2>
              <div className="quick-access-grid">
                {templateCards.map((template) => (
                  <div key={template.id} className="e-card modern-card quick-access-card template-card">
                    <div className="e-card-image template-image">
                      <img src={template.image} alt={template.title} />
                    </div>
                    <div className="e-card-content">
                      <h3>{template.title}</h3>
                      <p>{template.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeSection === 'docs' && (
            <section className="animate-fade-in-up">
              <h2 className="section-title">Documentation</h2>
              <p>Learn how to create and manage workflows effectively.</p>
            </section>
          )}
        </div>
        <ConfirmationDialog
          isOpen={!!projectToDelete || isMultiDeleteConfirmOpen}
          onClose={handleCloseDeleteDialog}
          onConfirm={handleConfirmDelete}
          content={
            isMultiDeleteConfirmOpen
              ? `Are you sure you want to delete ${projectsToDelete.length} selected project(s)? This action cannot be undone.`
              : `Are you sure you want to delete ${projectToDelete?.name ? `"${projectToDelete?.name}"` : 'this item'}? This action cannot be undone.`
          }
        />
      </main>
    </div>
  );
};

export default Home;