import React, { useEffect, useMemo, useState } from 'react';
import { enableRipple } from '@syncfusion/ej2-base';
import { ProjectData } from './types';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import Home from './components/Home';
import Editor from './components/Editor';
import WorkflowProjectService from './services/WorkflowProjectService';

import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Outlet,
  useNavigate,
  useParams,
  useLocation,
  useOutletContext,
} from 'react-router-dom';

import './App.css';

// Enable Syncfusion ripple
enableRipple(true);

type AppOutletContext = {
  projects: ProjectData[];
  bookmarkedProjects: string[];
  handleCreateNew: () => void;
  handleOpenProject: (project: ProjectData) => void;
  handleDeleteProject: (projectId: string) => void;
  handleMultipleDeleteProjects: (projectIds: string[]) => void;
  handleBookmarkToggle: (projectId: string) => void;
  handleSaveProject: (updatedProject: ProjectData) => void;
};

const AppContent: React.FC = () => {
  const { theme } = useTheme();
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const navigate = useNavigate();

  // Load projects on mount
  useEffect(() => {
    const loaded = WorkflowProjectService.getProjects();
    loaded.sort(
      (a, b) =>
        new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    );
    setProjects(loaded);
  }, []);

  const handleCreateNew = () => {
    const newProject = WorkflowProjectService.createBlankProject();
    navigate(`/workflow/${newProject.id}`, { state: { newProject } });
  };

  const handleDeleteProject = (projectId: string) => {
    WorkflowProjectService.deleteProject(projectId);
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
  };

  const handleMultipleDeleteProjects = (projectIds: string[]) => {
    WorkflowProjectService.deleteMultipleProjects(projectIds);
    setProjects((prev) => prev.filter((p) => !projectIds.includes(p.id)));
  };

  const handleSaveProject = (updated: ProjectData) => {
    WorkflowProjectService.saveProject(updated);
    const updatedProjects = WorkflowProjectService.getProjects();
    updatedProjects.sort(
      (a, b) =>
        new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    );
    setProjects(updatedProjects);
  };

  const handleOpenProject = (project: ProjectData) => {
    navigate(`/workflow/${project.id}`);
  };

  const handleBookmarkToggle = (projectId: string) => {
    const updated = WorkflowProjectService.toggleBookmark(projectId);
    if (updated) {
      setProjects((prev) => {
        const next = prev.map((p) =>
          p.id === projectId ? { ...p, isBookmarked: updated.isBookmarked } : p
        );
        return next.sort(
          (a, b) =>
            new Date(b.lastModified).getTime() -
            new Date(a.lastModified).getTime()
        );
      });
    }
  };

  const bookmarkedProjects = projects
    .filter((p) => p.isBookmarked)
    .map((p) => p.id);

  return (
    <div className="app-container" data-theme={theme}>
      <Outlet
        context={{
          projects,
          bookmarkedProjects,
          handleCreateNew,
          handleOpenProject,
          handleDeleteProject,
          handleMultipleDeleteProjects,
          handleBookmarkToggle,
          handleSaveProject,
        } satisfies AppOutletContext}
      />
    </div>
  );
};

function useAppOutlet() {
  return useOutletContext<AppOutletContext>();
}

// Home route wrapper
const HomeRoute: React.FC = () => {
  const {
    projects,
    bookmarkedProjects,
    handleCreateNew,
    handleOpenProject,
    handleDeleteProject,
    handleMultipleDeleteProjects,
    handleBookmarkToggle,
  } = useAppOutlet();

  return (
    <Home
      projects={projects}
      bookmarkedProjects={bookmarkedProjects}
      onCreateNew={handleCreateNew}
      onOpenProject={handleOpenProject}
      onDeleteProject={handleDeleteProject}
      onMultipleDeleteProjects={handleMultipleDeleteProjects}
      onBookmarkToggle={handleBookmarkToggle}
    />
  );
};

// Editor route wrapper
const EditorRoute: React.FC = () => {
  const { projects, handleSaveProject } = useAppOutlet();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const project =
    projects.find((p) => p.id === id) ?? (location.state as any)?.newProject;

  if (!project) {
    return <Navigate to="/" replace />;
  }

  return (
    <Editor
      project={project}
      onSaveProject={handleSaveProject}
      onBackToHome={() => navigate('/', { replace: true })}
    />
  );
};

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppContent />,
    errorElement: <div style={{ padding: 16 }}>Something went wrong. Please try again.</div>,
    children: [
      { index: true, element: <HomeRoute /> },
      { path: 'workflow/:id', element: <EditorRoute /> },
      { path: '*', element: <Navigate to="/" /> },
    ],
  },
]);

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  );
};

export default App;