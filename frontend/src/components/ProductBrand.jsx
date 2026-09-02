const ProductBrand = ({ className = '' }) => (
  <span className={`product-brand ${className}`.trim()}>
    <span className="product-brand__mark" aria-hidden="true">O</span>
    <span className="product-brand__copy">
      <strong>Orbit PM</strong>
      <small>AI workspace</small>
    </span>
  </span>
);

export default ProductBrand;
