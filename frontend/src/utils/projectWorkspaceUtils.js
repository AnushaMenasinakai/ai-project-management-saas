export const PROJECT_WORKSPACES = [
  { id: 'project-health', label: 'Health' },
  { id: 'project-members', label: 'Members' },
  { id: 'project-tasks', label: 'Tasks' },
  { id: 'project-documents', label: 'Documents' },
  { id: 'project-qa', label: 'Project Q&A' },
  { id: 'project-activity', label: 'Activity' },
];

const workspaceIds = new Set(PROJECT_WORKSPACES.map(({ id }) => id));

export const DEFAULT_PROJECT_WORKSPACE = 'project-health';

export const getProjectWorkspace = (hash = '') => {
  const workspace = hash.startsWith('#') ? hash.slice(1) : hash;
  return workspaceIds.has(workspace) ? workspace : DEFAULT_PROJECT_WORKSPACE;
};

export const getProjectWorkspaceHref = (pathname, workspaceId) => (
  `${pathname}#${workspaceIds.has(workspaceId) ? workspaceId : DEFAULT_PROJECT_WORKSPACE}`
);
