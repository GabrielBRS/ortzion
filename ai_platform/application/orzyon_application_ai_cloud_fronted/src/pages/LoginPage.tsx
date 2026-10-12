import { useEffect, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { ArrowRight, Cpu, Server, Bot } from 'lucide-react'
import { Logo } from '../components/Logo'
import { useApp } from '../state/AppContext'

export default function LoginPage() {
  const { session, login } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'
  // O e-mail só é usado na tela; a senha nunca sai deste componente nem é armazenada.
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (session) navigate(from === '/login' ? '/' : from, { replace: true })
  }, [session, from, navigate])

  const enter = (e?: FormEvent) => {
    e?.preventDefault()
    setPassword('')
    login()
  }

  return (
    <div className="grid min-h-full lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden border-r border-line bg-surface p-10 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage: 'linear-gradient(#1b222c 1px, transparent 1px), linear-gradient(90deg, #1b222c 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            maskImage: 'radial-gradient(ellipse at 30% 40%, black 30%, transparent 75%)',
          }}
        />
        <div className="relative">
          <Logo size="lg" />
        </div>
        <div className="relative max-w-md">
          <h1 className="text-3xl font-semibold tracking-tight">Console de clusters de IA</h1>
          <p className="mt-3 text-muted">Contrate capacidade, implante modelos e serviços, e administre agentes por organização.</p>
          <ul className="mt-8 space-y-4 text-sm">
            <li className="flex gap-3">
              <Server className="mt-0.5 size-4 text-accent" aria-hidden />
              <span>
                <span className="font-medium">Clusters virtuais ou dedicados</span>
                <span className="block text-muted">GPU com memória dedicada ou memória unificada AMD.</span>
              </span>
            </li>
            <li className="flex gap-3">
              <Cpu className="mt-0.5 size-4 text-accent" aria-hidden />
              <span>
                <span className="font-medium">Implantações de modelo compartilhadas</span>
                <span className="block text-muted">Vários agentes usam a mesma implantação, sem duplicar os pesos.</span>
              </span>
            </li>
            <li className="flex gap-3">
              <Bot className="mt-0.5 size-4 text-accent" aria-hidden />
              <span>
                <span className="font-medium">Agentes com rotas e playground</span>
                <span className="block text-muted">Prompt, ferramentas, rotas e limites por agente.</span>
              </span>
            </li>
          </ul>
        </div>
        <p className="relative text-xs text-subtle">© Orzyon Cloud · ambiente de demonstração</p>
      </section>

      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo size="lg" />
          </div>
          <h2 className="text-xl font-semibold">Entrar na Orzyon Cloud</h2>
          <p className="mt-1 text-sm text-muted">Acesse o console da sua organização.</p>

          <form onSubmit={enter} className="mt-6 space-y-4" autoComplete="off">
            <div>
              <label htmlFor="email" className="label">
                E-mail
              </label>
              <input id="email" type="email" className="input" placeholder="voce@empresa.com.br" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label htmlFor="password" className="label">
                Senha
              </label>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="••••••••"
                autoComplete="off"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary w-full">
              Entrar
            </button>
            <button type="button" className="btn-secondary w-full" onClick={() => enter()}>
              Explorar demonstração <ArrowRight className="size-4" aria-hidden />
            </button>
          </form>

          <p className="mt-6 rounded-lg border border-line bg-surface px-3 py-2 text-center text-xs text-subtle">
            Ambiente de demonstração — autenticação simulada
          </p>
        </div>
      </section>
    </div>
  )
}
