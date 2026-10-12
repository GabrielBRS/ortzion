import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { AuthRequestError, createSession } from '../../auth/authApi';
import { AuthShell, PasswordInput } from '../../components/auth/AuthShell';
import { DESTINOS } from '../../config/destinos';
import { useConteudo } from '../../i18n/ConteudoContext';
import { AUTH_COPY } from '../../i18n/auth';
import { usePagina } from '../../seo/usePagina';
import './auth.css';

export default function Entrar() {
  const { idioma, linkPara } = useConteudo();
  const copy = AUTH_COPY[idioma];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const messageRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  usePagina('entrar');

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestRef.current?.abort();
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setMessage(null);
    const controller = new AbortController();
    requestRef.current?.abort();
    requestRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 15_000);

    try {
      await createSession(email.trim(), password, controller.signal);
      if (!mountedRef.current || controller.signal.aborted) return;
      setRedirecting(true);
      window.location.assign(DESTINOS.plataforma);
    } catch (cause) {
      if (!mountedRef.current) return;
      const reason = cause instanceof AuthRequestError ? cause.reason : 'unavailable';
      const nextMessage = reason === 'invalid'
        ? copy.errors.invalidCredentials
        : reason === 'rate-limited'
          ? copy.errors.rateLimited
          : copy.errors.unavailable;
      setMessage(nextMessage);
      setPassword('');
      window.requestAnimationFrame(() => messageRef.current?.focus());
    } finally {
      window.clearTimeout(timeout);
      if (mountedRef.current) setBusy(false);
      if (requestRef.current === controller) requestRef.current = null;
    }
  };

  return (
    <AuthShell eyebrow={copy.login.eyebrow} title={copy.login.title} description={copy.login.description}>
      <form className="auth-form" onSubmit={handleSubmit} aria-busy={busy || redirecting}>
        {message && <div className="auth-message auth-message--error" ref={messageRef} tabIndex={-1} role="alert">{message}</div>}
        {redirecting && <div className="auth-message auth-message--success" role="status">{copy.login.redirecting}</div>}

        <label className="auth-field" htmlFor="login-email">
          <span>{copy.fields.email}</span>
          <input
            id="login-email"
            type="email"
            value={email}
            autoComplete="email"
            inputMode="email"
            required
            autoFocus
            onChange={event => setEmail(event.target.value)}
          />
        </label>

        <PasswordInput
          id="login-password"
          label={copy.fields.password}
          value={password}
          autoComplete="current-password"
          showLabel={copy.fields.showPassword}
          hideLabel={copy.fields.hidePassword}
          onChange={setPassword}
        />

        <Link className="auth-inline-link auth-forgot" to={linkPara('recuperarSenha')}>
          {copy.login.forgotPassword}
        </Link>

        <button className="btn btn-solid auth-submit" type="submit" disabled={busy || redirecting}>
          {busy ? copy.login.submitting : copy.login.submit}<span aria-hidden="true">→</span>
        </button>
      </form>

      <p className="auth-switch">
        {copy.login.noAccount} <Link to={linkPara('cadastro')}>{copy.login.createAccount}</Link>
      </p>
    </AuthShell>
  );
}
