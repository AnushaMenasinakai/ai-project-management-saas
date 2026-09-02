const EmptyState = ({ action, description, icon, title }) => (
  <section className="empty-state" aria-labelledby="empty-state-title">
    {icon && <div className="empty-state__icon" aria-hidden="true">{icon}</div>}
    <h2 id="empty-state-title">{title}</h2>
    <p>{description}</p>
    {action && <div className="empty-state__action">{action}</div>}
  </section>
);

export default EmptyState;
