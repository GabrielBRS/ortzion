import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { AuthRequestError, createRegistration } from '../../auth/authApi';
import { AuthShell, PasswordInput } from '../../components/auth/AuthShell';
import { useConteudo } from '../../i18n/ConteudoContext';
import { AUTH_COPY } from '../../i18n/auth';
import { usePagina } from '../../seo/usePagina';
import './auth.css';

export default function Cadastro() {
  const { idioma, linkPara } = useConteudo();
  const copy = AUTH_COPY[idioma];
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const messageRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  usePagina('cadastro');

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!success) return;
    const frame = window.requestAnimationFrame(() => successRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [success]);

  const showError = (value: string) => {
    setMessage(value);
    window.requestAnimationFrame(() => messageRef.current?.focus());
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;

    if (password !== passwordConfirmation) {
      showError(copy.errors.passwordMismatch);
      return;
    }

    setBusy(true);
    setMessage(null);
    const controller = new AbortController();
    requestRef.current?.abort();
    requestRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 15_000);

    try {
      await createRegistration(name.trim(), email.trim(), password, idioma, controller.signal);
      if (!mountedRef.current || controller.signal.aborted) return;
      setSuccess(true);
      setPassword('');
      setPasswordConfirmation('');
    } catch (cause) {
      if (!mountedRef.current) return;
      const reason = cause instanceof AuthRequestError ? cause.reason : 'unavailable';
      showError(
        reason === 'invalid'
          ? copy.errors.invalidRegistration
          : reason === 'rate-limited'
            ? copy.errors.rateLimited
            : copy.errors.unavailable,
      );
      setPassword('');
      setPasswordConfirmation('');
    } finally {
      window.clearTimeout(timeout);
      if (mountedRef.current) setBusy(false);
      if (requestRef.current === controller) requestRef.current = null;
    }
  };

  if (success) {
    return (
      <AuthShell eyebrow={copy.register.eyebrow} title={copy.register.successTitle} description={copy.register.successDescription}>
        <div className="auth-success-state" ref={successRef} role="status" aria-live="polite" tabIndex={-1}>
          <span className="sr-only">{copy.register.successTitle}. {copy.register.successDescription}</span>
          <Link className="btn btn-solid auth-success-link" to={linkPara('entrar')}>
            {copy.register.signIn}<span aria-hidden="true">→</span>
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell eyebrow={copy.register.eyebrow} title={copy.register.title} description={copy.register.description}>
      <form className="auth-form" onSubmit={handleSubmit} aria-busy={busy}>
        {message && <div className="auth-message auth-message--error" ref={messageRef} tabIndex={-1} role="alert">{message}</div>}

        <label className="auth-field" htmlFor="register-name">
          <span>{copy.fields.name}</span>
          <input
            id="register-name"
            type="text"
            value={name}
            autoComplete="name"
            required
            autoFocus
            onChange={event => setName(event.target.value)}
          />
        </label>

        <label className="auth-field" htmlFor="register-email">
          <span>{copy.fields.email}</span>
          <input
            id="register-email"
            type="email"
            value={email}
            autoComplete="email"
            inputMode="email"
            required
            onChange={event => setEmail(event.target.value)}
          />
        </label>

        <PasswordInput
          id="register-password"
          label={copy.fields.password}
          value={password}
          autoComplete="new-password"
          minLength={10}
          describedBy="register-password-hint"
          showLabel={copy.fields.showPassword}
          hideLabel={copy.fields.hidePassword}
          onChange={setPassword}
        />
        <p className="auth-hint" id="register-password-hint">{copy.register.passwordHint}</p>

        <PasswordInput
          id="register-password-confirmation"
          label={copy.fields.passwordConfirmation}
          value={passwordConfirmation}
          autoComplete="new-password"
          minLength={10}
          showLabel={copy.fields.showPassword}
          hideLabel={copy.fields.hidePassword}
          onChange={setPasswordConfirmation}
        />

        <button className="btn btn-solid auth-submit" type="submit" disabled={busy}>
          {busy ? copy.register.submitting : copy.register.submit}<span aria-hidden="true">→</span>
        </button>
      </form>

      <p className="auth-switch">
        {copy.register.hasAccount} <Link to={linkPara('entrar')}>{copy.register.signIn}</Link>
      </p>
    </AuthShell>
  );
}
