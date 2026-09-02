const Button = ({
  children,
  className = '',
  type = 'button',
  variant = 'primary',
  ...props
}) => (
  <button
    type={type}
    className={`button button--${variant} ${className}`.trim()}
    {...props}
  >
    {children}
  </button>
);

export default Button;
