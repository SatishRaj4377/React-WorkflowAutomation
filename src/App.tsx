import React, { useState, useEffect } from 'react';
import { enableRipple } from '@syncfusion/ej2-base';
import { ProjectData } from './types';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import Home from './components/Home';
import Editor from './components/Editor';
import WorkflowService from './services/WorkflowService';
import './App.css';
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams, Navigate, useLocation } from 'react-router-dom';

// Enable ripple effect for better interactivity
enableRipple(true);

// EditorPage wrapper to get :id param from router
const EditorPage: React.FC<{
  projects: ProjectData[];
  onSaveProject: (updated: ProjectData) => void;
}> = ({ projects, onSaveProject }) => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const project = projects.find(p => p.id === id) || location.state?.newProject;
  if (!project) return <Navigate to="/" />;

  return (
    <Editor
      project={project}
      onSaveProject={(updated) => {
        WorkflowService.saveProject(updated); // Save project only when user triggers save
        onSaveProject(updated);
      }}
      onBackToHome={() => navigate('/', { replace: true })}
    />
  );
};

const AppContent: React.FC = () => {
  const { theme } = useTheme();
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const navigate = useNavigate();

  // Load projects from local storage on component mount
  useEffect(() => {
    const loadedProjects = WorkflowService.getProjects();
    loadedProjects.sort((a, b) =>
      new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    );
    setProjects(loadedProjects);
  }, []);

  const handleCreateNew = () => {
    const newProject = WorkflowService.createBlankProject();
    // Navigate to the new workflow immediately
    navigate(`/workflow/${newProject.id}`, { state: { newProject } }); // Pass via router state
  };

  const handleDeleteProject = (projectId: string) => {
    WorkflowService.deleteProject(projectId);
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
  };

  const handleSaveProject = (updatedProject: ProjectData) => {
    WorkflowService.saveProject(updatedProject);
    const updatedProjects = WorkflowService.getProjects();
    updatedProjects.sort((a, b) =>
      new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    );
    setProjects(updatedProjects);
  };
  
  const handleOpenProject = (project: ProjectData) => {
    navigate(`/workflow/${project.id}`);
  };

  const handleBookmarkToggle = (projectId: string) => {
    const updatedProject = WorkflowService.toggleBookmark(projectId);
    if (updatedProject) {
      // Update the projects state with the new bookmark status
      // Use functional update to prevent unnecessary re-renders and maintain order
      setProjects(prev => {
        const newProjects = prev.map(project => 
          project.id === projectId 
            ? { ...project, isBookmarked: updatedProject.isBookmarked }
            : project
        );
        // Maintain the original sort order (by lastModified date)
        return newProjects.sort((a, b) =>
          new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
        );
      });
    }
  };

  // Get bookmarked project IDs for the Home component
  const bookmarkedProjects = projects
    .filter(project => project.isBookmarked)
    .map(project => project.id);

  return (
    <div className="app-container" data-theme={theme}>
      <Routes>
        <Route path="/" element={
          <Home
            projects={projects}
            bookmarkedProjects={bookmarkedProjects}
            onCreateNew={handleCreateNew}
            onOpenProject={handleOpenProject}
            onDeleteProject={handleDeleteProject}
            onBookmarkToggle={handleBookmarkToggle}
          />
        } />
        <Route path="/workflow/:id" element={
          <EditorPage projects={projects} onSaveProject={handleSaveProject} />
        } />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  );
};

export default App;