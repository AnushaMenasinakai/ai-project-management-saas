const PageHeader = ({ eyebrow, title, description, actions }) => (
  <header className="page-header">
    <div className="page-header__copy">
      {eyebrow && <p className="page-header__eyebrow">{eyebrow}</p>}
      <h1>{title}</h1>
      {description && <p className="page-header__description">{description}</p>}
    </div>

    {actions && <div className="page-header__actions">{actions}</div>}
  </header>
);

export default PageHeader;
