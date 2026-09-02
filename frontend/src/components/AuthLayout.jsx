import ProductBrand from './ProductBrand';

const AuthLayout = ({ children, description, eyebrow, title }) => (
  <main className="auth-page">
    <a className="skip-link" href="#auth-content">Skip to form</a>

    <div className="auth-layout">
      <section className="auth-layout__intro" aria-label="Product introduction">
        <ProductBrand />
        <div className="auth-layout__intro-copy">
          <p className="auth-layout__kicker">Plan clearly. Deliver together.</p>
          <h2>Project knowledge and AI assistance in one workspace.</h2>
          <p>
            Keep your team, tasks, documents, and project context organized.
          </p>
        </div>
      </section>

      <section className="auth-card" id="auth-content" aria-labelledby="auth-title">
        <header className="auth-card__header">
          <p className="auth-card__eyebrow">{eyebrow}</p>
          <h1 id="auth-title">{title}</h1>
          <p>{description}</p>
        </header>
        {children}
      </section>
    </div>
  </main>
);

export default AuthLayout;
