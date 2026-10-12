import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { AuthRequestError, requestPasswordReset } from '../../auth/authApi';
import { AuthShell } from '../../components/auth/AuthShell';
import { useConteudo } from '../../i18n/ConteudoContext';
import { AUTH_COPY } from '../../i18n/auth';
import { usePagina } from '../../seo/usePagina';
import './auth.css';

export default function RecuperarSenha() {
  const { idioma, linkPara } = useConteudo();
  const copy = AUTH_COPY[idioma];
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const messageRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  usePagina('recuperarSenha');

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
      await requestPasswordReset(email.trim(), idioma, controller.signal);
      if (!mountedRef.current || controller.signal.aborted) return;
      setSuccess(true);
    } catch (cause) {
      if (!mountedRef.current) return;
      const reason = cause instanceof AuthRequestError ? cause.reason : 'unavailable';
      setMessage(reason === 'rate-limited' ? copy.errors.rateLimited : copy.errors.unavailable);
      window.requestAnimationFrame(() => messageRef.current?.focus());
    } finally {
      window.clearTimeout(timeout);
      if (mountedRef.current) setBusy(false);
      if (requestRef.current === controller) requestRef.current = null;
    }
  };

  if (success) {
    return (
      <AuthShell eyebrow={copy.forgot.eyebrow} title={copy.forgot.successTitle} description={copy.forgot.successDescription}>
        <div className="auth-success-state" ref={successRef} role="status" aria-live="polite" tabIndex={-1}>
          <span className="sr-only">{copy.forgot.successTitle}. {copy.forgot.successDescription}</span>
          <Link className="btn btn-solid auth-success-link" to={linkPara('entrar')}>
            {copy.forgot.backToLogin}<span aria-hidden="true">→</span>
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell eyebrow={copy.forgot.eyebrow} title={copy.forgot.title} description={copy.forgot.description}>
      <form className="auth-form" onSubmit={handleSubmit} aria-busy={busy}>
        {message && <div className="auth-message auth-message--error" ref={messageRef} tabIndex={-1} role="alert">{message}</div>}

        <label className="auth-field" htmlFor="recovery-email">
          <span>{copy.fields.email}</span>
          <input
            id="recovery-email"
            type="email"
            value={email}
            autoComplete="email"
            inputMode="email"
            required
            autoFocus
            onChange={event => setEmail(event.target.value)}
          />
        </label>

        <button className="btn btn-solid auth-submit" type="submit" disabled={busy}>
          {busy ? copy.forgot.submitting : copy.forgot.submit}<span aria-hidden="true">→</span>
        </button>
      </form>

      <p className="auth-switch"><Link to={linkPara('entrar')}>{copy.forgot.backToLogin}</Link></p>
    </AuthShell>
  );
}
