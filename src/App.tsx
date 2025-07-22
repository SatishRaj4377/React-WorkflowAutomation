import React, { useState, useEffect } from 'react';
import { enableRipple } from '@syncfusion/ej2-base';
import { ProjectData } from './types';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import Home from './components/Home';
import Editor from './components/Editor';
import WorkflowService from './services/WorkflowService';
import './App.css';
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams, Navigate } from 'react-router-dom';

// Enable ripple effect for better interactivity
enableRipple(true);

// Register your Syncfusion license key here if you have one
// registerLicense('YOUR_LICENSE_KEY');

// EditorPage wrapper to get :id param from router
const EditorPage: React.FC<{
  projects: ProjectData[];
  onSaveProject: (updated: ProjectData) => void;
}> = ({ projects, onSaveProject }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const project = projects.find((p) => p.id === id);
  if (!project) return <Navigate to="/" />;
  return (
    <Editor
      project={project}
      onSaveProject={onSaveProject}
      onBackToHome={() => navigate('/')} />
  );
};

const AppContent: React.FC = () => {
  const { theme } = useTheme();
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const navigate = useNavigate();

  // Load projects from local storage on component mount
  useEffect(() => {
    const loadedProjects = WorkflowService.getProjects();
    setProjects(loadedProjects);
  }, []);

  const handleCreateNew = () => {
    const newProject = WorkflowService.createBlankProject();
    setProjects([...projects, newProject]);
    // Navigate to the new workflow immediately
    navigate(`/workflow/${newProject.id}`);
  };

  const handleDeleteProject = (projectId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this project? This action cannot be undone.');
    if (!confirmed) return;

    WorkflowService.deleteProject(projectId);
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
  };

  const handleSaveProject = (updatedProject: ProjectData) => {
    setProjects(prev =>
      prev.map(p => p.id === updatedProject.id ? updatedProject : p)
    );
  };

  const handleOpenProject = (project: ProjectData) => {
    navigate(`/workflow/${project.id}`);
  };

  return (
    <div className="app-container" data-theme={theme}>
      <Routes>
        <Route path="/" element={
          <Home
            projects={projects}
            onCreateNew={handleCreateNew}
            onOpenProject={handleOpenProject}
            onDeleteProject={handleDeleteProject}
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