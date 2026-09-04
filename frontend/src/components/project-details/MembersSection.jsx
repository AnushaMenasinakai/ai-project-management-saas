import Alert from '../Alert';
import Button from '../Button';
import Card from '../Card';
import EmptyState from '../EmptyState';
import LoadingState from '../LoadingState';

const MembersSection = ({
  members,
  isProjectOwner,
  showMemberForm,
  memberEmail,
  addingMember,
  addMemberError,
  removingMemberId,
  removeMemberError,
  membersLoading,
  membersError,
  onShowForm,
  onHideForm,
  onEmailChange,
  onAddMember,
  onRemoveMember,
}) => (
  <Card id="project-members" className="workspace-section members-workspace" aria-labelledby="members-heading">
    <div className="workspace-section__header">
      <div>
        <p className="section-eyebrow">Collaboration</p>
        <h2 id="members-heading">Members</h2>
        <p>{members.length} {members.length === 1 ? 'member' : 'members'} can collaborate in this project.</p>
      </div>
      {isProjectOwner && !showMemberForm && (
        <Button variant="secondary" onClick={onShowForm}>+ Add member</Button>
      )}
    </div>

    {isProjectOwner && showMemberForm && (
      <form className="workspace-form member-form" onSubmit={onAddMember}>
        <div className="member-form__heading">
          <h3>Add project member</h3>
          <p>Add a registered user by email address.</p>
        </div>
        <div className="form-field">
          <label htmlFor="member-email">Member Email</label>
          <input
            id="member-email"
            type="email"
            value={memberEmail}
            onChange={onEmailChange}
            placeholder="Enter member email"
          />
        </div>
        {addMemberError && <Alert>{addMemberError}</Alert>}
        <Button type="submit" disabled={addingMember}>
          {addingMember ? 'Adding...' : 'Add Member'}
        </Button>
        <Button type="button" variant="secondary" disabled={addingMember} onClick={onHideForm}>
          Cancel
        </Button>
      </form>
    )}

    {isProjectOwner && removeMemberError && <Alert>{removeMemberError}</Alert>}
    {membersLoading && <LoadingState message="Loading members..." />}
    {membersError && <Alert>{membersError}</Alert>}
    {!membersLoading && !membersError && members.length === 0 && (
      <EmptyState title="No members yet" description="Project members will appear here after the owner adds them." />
    )}
    {!membersLoading && !membersError && members.length > 0 && (
      <ul className="member-list">
        {members.map((member) => (
          <li className="member-row" key={member._id}>
            <span className="member-avatar" aria-hidden="true">{member.name?.charAt(0).toUpperCase() || '?'}</span>
            <span className="member-identity"><strong>{member.name}</strong><span>{member.email}</span></span>
            {isProjectOwner && (
              <Button
                type="button"
                variant="danger-secondary"
                onClick={() => onRemoveMember(member._id)}
                disabled={removingMemberId === member._id}
              >
                {removingMemberId === member._id ? 'Removing...' : 'Remove'}
              </Button>
            )}
          </li>
        ))}
      </ul>
    )}
  </Card>
);

export default MembersSection;
