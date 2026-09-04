import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';

const useProjectMembers = (projectId) => {
  const [resource, setResource] = useState({ projectId: null, members: [], error: '' });
  const [memberEmail, setMemberEmail] = useState('');
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [addMemberError, setAddMemberError] = useState('');
  const [removingMemberId, setRemovingMemberId] = useState(null);
  const [removeMemberError, setRemoveMemberError] = useState('');

  const refreshMembers = useCallback(async () => {
    setResource((current) => ({ ...current, projectId, error: '', loading: true }));
    try {
      const response = await api.get(`/projects/${projectId}/members`);
      setResource({ projectId, members: response.data.members, error: '', loading: false });
      return response.data.members;
    } catch (error) {
      console.error('Fetch members error:', error);
      setResource((current) => ({
        projectId,
        members: current.projectId === projectId ? current.members : [],
        error: error.response?.data?.message || 'Failed to load project members.',
        loading: false,
      }));
      return null;
    }
  }, [projectId]);

  useEffect(() => {
    let active = true;
    api.get(`/projects/${projectId}/members`)
      .then((response) => {
        if (active) setResource({ projectId, members: response.data.members, error: '', loading: false });
      })
      .catch((error) => {
        console.error('Fetch members error:', error);
        if (active) {
          setResource((current) => ({
            projectId,
            members: current.projectId === projectId ? current.members : [],
            error: error.response?.data?.message || 'Failed to load project members.',
            loading: false,
          }));
        }
      });
    return () => { active = false; };
  }, [projectId]);

  const addMember = async (event) => {
    event.preventDefault();
    setAddMemberError('');
    if (!memberEmail.trim()) {
      setAddMemberError('Member email is required.');
      return;
    }
    try {
      setAddingMember(true);
      await api.post(`/projects/${projectId}/members`, { email: memberEmail.trim() });
      setMemberEmail('');
      await refreshMembers();
      setShowMemberForm(false);
    } catch (error) {
      console.error('Add member error:', error);
      setAddMemberError(error.response?.data?.message || 'Failed to add member.');
    } finally {
      setAddingMember(false);
    }
  };

  const removeMember = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this member from the project?')) return;
    try {
      setRemovingMemberId(userId);
      setRemoveMemberError('');
      await api.delete(`/projects/${projectId}/members/${userId}`);
      await refreshMembers();
    } catch (error) {
      console.error('Remove member error:', error);
      setRemoveMemberError(error.response?.data?.message || 'Failed to remove member.');
    } finally {
      setRemovingMemberId(null);
    }
  };

  const showAddMemberForm = () => {
    setShowMemberForm(true);
    setAddMemberError('');
  };
  const hideAddMemberForm = () => {
    setShowMemberForm(false);
    setAddMemberError('');
  };

  return {
    members: resource.projectId === projectId ? resource.members : [],
    membersLoading: resource.projectId !== projectId || resource.loading === true,
    membersError: resource.projectId === projectId ? resource.error : '',
    memberEmail,
    setMemberEmail,
    showMemberForm,
    addingMember,
    addMemberError,
    removingMemberId,
    removeMemberError,
    addMember,
    removeMember,
    showAddMemberForm,
    hideAddMemberForm,
  };
};

export default useProjectMembers;
