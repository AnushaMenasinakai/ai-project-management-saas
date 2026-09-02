const Card = ({ as: Component = 'section', className = '', children, ...props }) => (
  <Component className={`card ${className}`.trim()} {...props}>
    {children}
  </Component>
);

export default Card;
