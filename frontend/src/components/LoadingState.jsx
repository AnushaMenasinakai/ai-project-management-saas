const LoadingState = ({ message = 'Loading...' }) => (
  <div className="loading-state" role="status" aria-live="polite">
    <span className="loading-state__indicator" aria-hidden="true" />
    <span>{message}</span>
  </div>
);

export default LoadingState;
