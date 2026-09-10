import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../services/api';
import {
  buildDashboardSummary,
  buildHealthSummary,
  mergeRecentActivities,
  selectRecentProjects,
} from '../utils/dashboardUtils';

const emptyData = {
  summary: buildDashboardSummary(),
  recentProjects: [],
  recentActivity: [],
  healthSummary: buildHealthSummary(),
};

const useDashboardData = (userId) => {
  const [resource, setResource] = useState({
    userId: null,
    data: emptyData,
    loading: false,
    error: '',
    activityError: '',
    healthError: '',
  });
  const requestIdRef = useRef(0);
  const fetchingRef = useRef(false);

  const fetchDashboard = useCallback(async () => {
    if (!userId || fetchingRef.current) return false;

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    fetchingRef.current = true;
    setResource((current) => ({
      userId,
      data: current.userId === userId ? current.data : emptyData,
      loading: true,
      error: '',
      activityError: '',
      healthError: '',
    }));

    try {
      const projectsResponse = await api.get('/projects');
      const projects = Array.isArray(projectsResponse.data.projects)
        ? projectsResponse.data.projects
        : [];
      const recentProjects = selectRecentProjects(projects);

      const [activityResults, healthResults] = await Promise.all([
        Promise.allSettled(recentProjects.map(async (project) => ({
          project,
          activities: (await api.get(`/projects/${project._id}/activities?limit=5`)).data.activities,
        }))),
        Promise.allSettled(recentProjects.map(async (project) => ({
          project,
          health: (await api.get(`/projects/${project._id}/health`)).data.health,
        }))),
      ]);

      if (requestId !== requestIdRef.current) return false;

      const activityGroups = activityResults
        .filter((result) => result.status === 'fulfilled')
        .map((result) => result.value);
      const healthByProject = healthResults
        .filter((result) => result.status === 'fulfilled')
        .map((result) => result.value);
      const healthMap = new Map(healthByProject.map(({ project, health }) => [project._id, health]));

      setResource({
        userId,
        data: {
          summary: buildDashboardSummary(projects),
          recentProjects: recentProjects.map((project) => ({
            ...project,
            health: healthMap.get(project._id) || null,
          })),
          recentActivity: mergeRecentActivities(activityGroups),
          healthSummary: buildHealthSummary(healthByProject),
        },
        loading: false,
        error: '',
        activityError: activityResults.some((result) => result.status === 'rejected')
          ? 'Some recent activity could not be loaded.'
          : '',
        healthError: healthResults.some((result) => result.status === 'rejected')
          ? 'Some project health summaries could not be loaded.'
          : '',
      });
      return true;
    } catch (error) {
      if (requestId === requestIdRef.current) {
        setResource((current) => ({
          ...current,
          userId,
          loading: false,
          error: error.response?.data?.message || 'Failed to load dashboard data.',
        }));
      }
      return false;
    } finally {
      if (requestId === requestIdRef.current) fetchingRef.current = false;
    }
  }, [userId]);

  useEffect(() => {
    requestIdRef.current += 1;
    fetchingRef.current = false;

    if (!userId) {
      setResource({ userId: null, data: emptyData, loading: false, error: '', activityError: '', healthError: '' });
      return undefined;
    }

    fetchDashboard();
    return () => { requestIdRef.current += 1; };
  }, [fetchDashboard, userId]);

  const isCurrentUser = resource.userId === userId;

  return {
    ...(isCurrentUser ? resource.data : emptyData),
    loading: isCurrentUser && resource.loading,
    error: isCurrentUser ? resource.error : '',
    activityError: isCurrentUser ? resource.activityError : '',
    healthError: isCurrentUser ? resource.healthError : '',
    retry: fetchDashboard,
  };
};

export default useDashboardData;
