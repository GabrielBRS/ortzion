import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { useConteudo } from '../../i18n/ConteudoContext';
import { AUTH_COPY } from '../../i18n/auth';

interface AuthShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}

export function AuthShell({ eyebrow, title, description, children }: AuthShellProps) {
  const { idioma, linkPara } = useConteudo();
  const copy = AUTH_COPY[idioma].shell;

  return (
    <section className="auth-page">
      <div className="container auth-layout">
        <div className="auth-panel">
          <Link className="auth-back" to={linkPara('home')}>
            <span aria-hidden="true">←</span>{copy.backHome}
          </Link>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="auth-description">{description}</p>
          {children}
        </div>

        <aside className="auth-ecosystem" aria-label={copy.ecosystemLabel}>
          <img src="/orzyon-logo-horizontal.svg" alt="ORZYON — AI Systems Engineering" />
          <div className="auth-ecosystem__copy">
            <p>{copy.ecosystemLabel}</p>
            <h2>{copy.ecosystemTitle}</h2>
            <p>{copy.ecosystemDescription}</p>
          </div>
          <ul>
            {copy.features.map((feature, index) => (
              <li key={feature}>
                <span aria-hidden="true">0{index + 1}</span>{feature}
              </li>
            ))}
          </ul>
          <p className="auth-security"><i aria-hidden="true" />{copy.securityNote}</p>
        </aside>
      </div>
    </section>
  );
}

interface PasswordInputProps {
  id: string;
  label: string;
  value: string;
  autoComplete: 'current-password' | 'new-password';
  showLabel: string;
  hideLabel: string;
  describedBy?: string;
  minLength?: number;
  onChange: (value: string) => void;
}

export function PasswordInput({
  id,
  label,
  value,
  autoComplete,
  showLabel,
  hideLabel,
  describedBy,
  minLength,
  onChange,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      <span className="auth-password-control">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          autoComplete={autoComplete}
          minLength={minLength}
          required
          aria-describedby={describedBy}
          onChange={event => onChange(event.target.value)}
        />
        <button
          type="button"
          aria-label={visible ? hideLabel : showLabel}
          aria-pressed={visible}
          onClick={() => setVisible(current => !current)}
        >
          {visible ? '○' : '●'}
        </button>
      </span>
    </div>
  );
}
