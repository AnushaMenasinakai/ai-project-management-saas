import {
  formatActivityMessage,
  formatActivityTimestamp,
} from '../../utils/activityUtils';

const ActivityItem = ({ activity }) => (
  <li className="activity-item">
    <span className="activity-item__marker" aria-hidden="true" />
    <div className="activity-item__content">
      <p>{formatActivityMessage(activity)}</p>
      <time dateTime={activity.createdAt}>{formatActivityTimestamp(activity.createdAt)}</time>
    </div>
  </li>
);

export default ActivityItem;
