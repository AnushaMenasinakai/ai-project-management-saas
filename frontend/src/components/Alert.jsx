const Alert = ({ children, className = '', title, variant = 'error' }) => (
  <div
    className={`alert alert--${variant} ${className}`.trim()}
    role={variant === 'error' ? 'alert' : 'status'}
  >
    <span className="alert__icon" aria-hidden="true">
      {variant === 'error' ? '!' : 'i'}
    </span>
    <div>
      {title && <strong className="alert__title">{title}</strong>}
      <div className="alert__content">{children}</div>
    </div>
  </div>
);

export default Alert;
