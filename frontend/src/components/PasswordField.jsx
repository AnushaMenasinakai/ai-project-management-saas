import { useState } from 'react';

const PasswordField = ({ helper, id, label = 'Password', ...inputProps }) => {
  const [visible, setVisible] = useState(false);
  const helperId = helper ? `${id}-help` : undefined;

  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <div className="password-field">
        <input
          {...inputProps}
          aria-describedby={helperId}
          id={id}
          type={visible ? 'text' : 'password'}
        />
        <button
          className="password-field__toggle"
          type="button"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m3 3 18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 4.3A10.6 10.6 0 0 1 12 4c5.5 0 9 5.2 9 5.2a14.8 14.8 0 0 1-2.4 2.8M6.6 6.6A15 15 0 0 0 3 9.2S6.5 16 12 16c1.2 0 2.3-.3 3.3-.7" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 12s3.5-6.8 9-6.8 9 6.8 9 6.8-3.5 6.8-9 6.8S3 12 3 12Z" />
              <circle cx="12" cy="12" r="2.7" />
            </svg>
          )}
        </button>
      </div>
      {helper && <small className="form-help" id={helperId}>{helper}</small>}
    </div>
  );
};

export default PasswordField;
