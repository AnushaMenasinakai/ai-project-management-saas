const Badge = ({ children, className = '', variant = 'neutral' }) => (
  <span className={`badge badge--${variant} ${className}`.trim()}>
    {children}
  </span>
);

export default Badge;
