import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Code2, Container, FileUp, Loader2, Package, Plus, X } from 'lucide-react'
import type { EnvVar, ServiceKind, SourceRuntime } from '../domain/types'
import { useOrg } from '../state/AppContext'
import { createApplication, ApiError } from '../services/api'
import { useToast } from '../components/Toast'
import { Field, IssueList, Notice, OptionCard, PageHeader, Panel } from '../components/ui'
import { RUNTIME_DEFAULTS, RUNTIME_LABEL, SAMPLE_CODE } from '../mock/samples'
import { slugify } from '../lib/format'

const SECRET_RE = /secret|token|senha|password|key/i

export default function ApplicationCreatePage() {
  const { org } = useOrg()
  const navigate = useNavigate()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [kind, setKind] = useState<ServiceKind>('source')
  const [runtime, setRuntime] = useState<SourceRuntime>('python')
  const [fileName, setFileName] = useState<string>(RUNTIME_DEFAULTS.python.fileName)
  const [code, setCode] = useState<string>(SAMPLE_CODE.python)
  const [command, setCommand] = useState<string>(RUNTIME_DEFAULTS.python.command)
  const [image, setImage] = useState('')
  const [imageCommand, setImageCommand] = useState('')
  const [version, setVersion] = useState('v1.0.0')
  const [env, setEnv] = useState<EnvVar[]>([{ key: 'LOG_LEVEL', value: 'info' }])
  const [busy, setBusy] = useState(false)
  const [issues, setIssues] = useState<string[]>([])

  const slug = slugify(name)
  const hasOrigin = kind === 'source' ? code.trim().length > 0 : image.trim().length > 0

  const pickRuntime = (r: SourceRuntime) => {
    setRuntime(r)
    setFileName(RUNTIME_DEFAULTS[r].fileName)
    setCommand(RUNTIME_DEFAULTS[r].command)
    setCode(SAMPLE_CODE[r])
  }

  const onFile = (f: File | undefined) => {
    if (!f) return
    setFileName(f.name)
    // Lido apenas no navegador para exibição; nada é enviado ou executado.
    if (f.size > 200_000) {
      setCode(`# ${f.name} (${Math.round(f.size / 1024)} KiB) selecionado localmente.\n# Arquivo grande demais para exibição; não é enviado nem executado.`)
      return
    }
    f.text().then(setCode).catch(() => setCode(`# Não foi possível ler ${f.name} localmente.`))
  }

  const submit = async () => {
    setBusy(true)
    setIssues([])
    try {
      const app = await createApplication({
        orgId: org.id,
        name,
        description,
        kind,
        runtime: kind === 'source' ? runtime : undefined,
        fileName: kind === 'source' ? fileName : undefined,
        code: kind === 'source' ? code : undefined,
        image: kind === 'image' ? image : undefined,
        command: kind === 'source' ? command : imageCommand,
        env,
        version,
      })
      toast.success(`Aplicação "${app.name}" criada.`)
      navigate(`/aplicacoes/${app.id}`)
    } catch (e) {
      if (e instanceof ApiError) setIssues([e.message, ...e.details])
      toast.error(e)
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Nova aplicação"
        description="A aplicação guarda o código ou a imagem. Depois, ela é implantada como serviço em um ou mais clusters. Nada é executado nem enviado."
        crumbs={[{ label: org.name, to: '/' }, { label: 'Aplicações', to: '/aplicacoes' }, { label: 'Nova' }]}
      />
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-4">
          <Panel title="Identificação">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nome da aplicação" htmlFor="ap-name" hint={slug ? `Nome técnico das instâncias: ${slug}` : 'Ex.: Orzyon Medical AI Services'}>
                <input id="ap-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Minha aplicação" />
              </Field>
              <Field label="Versão" htmlFor="ap-version" hint="Versão do código ou da imagem.">
                <input id="ap-version" className="input font-mono" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="v1.0.0" />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Descrição" htmlFor="ap-desc">
                <input id="ap-desc" className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Para que serve esta aplicação" />
              </Field>
            </div>
          </Panel>

          <Panel title="Origem">
            <div className="grid gap-3 md:grid-cols-2">
              <OptionCard
                name="kind"
                selected={kind === 'source'}
                onSelect={() => setKind('source')}
                icon={<Code2 className="size-5" />}
                title="Código-fonte"
                description="Runtimes oficiais demonstrativos: Python, Mojo e Python + Mojo."
              />
              <OptionCard
                name="kind"
                selected={kind === 'image'}
                onSelect={() => setKind('image')}
                icon={<Container className="size-5" />}
                title="Imagem de contêiner"
                description="Aplicações em outras linguagens, como Go e Rust."
              />
            </div>
          </Panel>

          {kind === 'source' ? (
            <Panel title="Código-fonte">
              <div className="space-y-4">
                <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Runtime">
                  {(['python', 'mojo', 'python_mojo'] as SourceRuntime[]).map((r) => (
                    <OptionCard
                      key={r}
                      name="runtime"
                      selected={runtime === r}
                      onSelect={() => pickRuntime(r)}
                      title={RUNTIME_LABEL[r]}
                      description={r === 'python' ? 'Interpretador Python' : r === 'mojo' ? 'Código Mojo compilado' : 'Python com módulos Mojo'}
                    />
                  ))}
                </div>
                {runtime === 'python_mojo' && (
                  <Notice>
                    Python + Mojo permite acelerar as partes da aplicação implementadas em Mojo, chamadas a partir do Python. O restante continua em Python; não há conversão
                    automática de todo o código Python para código nativo.
                  </Notice>
                )}
                <div className="flex flex-wrap items-end gap-3">
                  <Field label="Arquivo principal" htmlFor="ap-file">
                    <input id="ap-file" className="input w-56 font-mono" value={fileName} onChange={(e) => setFileName(e.target.value)} />
                  </Field>
                  <input ref={fileRef} type="file" className="sr-only" accept=".py,.mojo,.txt,.toml" onChange={(e) => onFile(e.target.files?.[0])} tabIndex={-1} />
                  <button className="btn-secondary" onClick={() => fileRef.current?.click()}>
                    <FileUp className="size-4" /> Selecionar arquivo
                  </button>
                  <span className="text-[11px] text-subtle">O arquivo é lido apenas no navegador.</span>
                </div>
                <div>
                  <label htmlFor="ap-code" className="label">
                    Editor
                  </label>
                  <textarea id="ap-code" spellCheck={false} className="input min-h-64 font-mono text-[12.5px] leading-relaxed whitespace-pre" value={code} onChange={(e) => setCode(e.target.value)} />
                </div>
                <Field label="Comando de entrada" htmlFor="ap-cmd">
                  <input id="ap-cmd" className="input font-mono" value={command} onChange={(e) => setCommand(e.target.value)} />
                </Field>
              </div>
            </Panel>
          ) : (
            <Panel title="Imagem de contêiner">
              <div className="space-y-4">
                <Field label="Referência da imagem" htmlFor="ap-image" hint="Apenas registrada; a imagem não é baixada nem executada nesta demonstração.">
                  <input id="ap-image" className="input font-mono" value={image} onChange={(e) => setImage(e.target.value)} placeholder="registry.orzyon-cloud.example/minha-org/app:1.0.0" />
                </Field>
                <Field label="Comando (opcional)" htmlFor="ap-icmd" hint="Substitui o comando padrão da imagem.">
                  <input id="ap-icmd" className="input font-mono" value={imageCommand} onChange={(e) => setImageCommand(e.target.value)} placeholder="/app/server --port 8080" />
                </Field>
                <Notice>
                  Esta opção permite aplicações em outras linguagens, incluindo Go e Rust. As dependências e a imagem são mantidas pelo cliente; a Orzyon Cloud fornece a execução no
                  cluster.
                </Notice>
              </div>
            </Panel>
          )}

          <Panel
            title="Variáveis de ambiente"
            description="Use somente valores demonstrativos. Não informe segredos reais."
            actions={
              <button className="btn-secondary btn-sm" onClick={() => setEnv([...env, { key: '', value: '' }])}>
                <Plus className="size-3.5" /> Adicionar
              </button>
            }
          >
            {env.length === 0 && <p className="text-sm text-muted">Nenhuma variável.</p>}
            <div className="space-y-2">
              {env.map((v, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className="input font-mono text-xs"
                    aria-label={`Nome da variável ${i + 1}`}
                    placeholder="NOME"
                    value={v.key}
                    onChange={(e) => setEnv(env.map((x, j) => (j === i ? { ...x, key: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_') } : x)))}
                  />
                  <input
                    className="input font-mono text-xs"
                    aria-label={`Valor da variável ${i + 1}`}
                    placeholder="valor"
                    type={SECRET_RE.test(v.key) ? 'password' : 'text'}
                    autoComplete="off"
                    value={v.value}
                    onChange={(e) => setEnv(env.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
                  />
                  <button className="btn-ghost btn-sm" aria-label={`Remover variável ${i + 1}`} onClick={() => setEnv(env.filter((_, j) => j !== i))}>
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </div>
            {env.some((v) => SECRET_RE.test(v.key)) && (
              <p className="mt-2 text-xs text-warn">Variáveis com nomes de segredo (TOKEN, SECRET, SENHA, KEY) não são persistidas; o valor é descartado ao salvar.</p>
            )}
          </Panel>
        </div>

        <div className="min-w-0 space-y-4">
          <Panel title="Salvar aplicação" className="xl:sticky xl:top-20">
            <div className="space-y-4">
              <IssueList issues={issues} />
              <p className="text-sm text-muted">
                Organização: <span className="text-fg">{org.name}</span>
              </p>
              <p className="text-xs text-subtle">Depois de salva, a aplicação pode ser implantada como serviço em qualquer cluster desta organização.</p>
              <button className="btn-primary w-full" disabled={busy || !slug || !hasOrigin} onClick={submit}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Package className="size-4" />} Criar aplicação
              </button>
              {!slug && <p className="text-center text-[11px] text-subtle">Informe o nome da aplicação.</p>}
              {slug && !hasOrigin && <p className="text-center text-[11px] text-subtle">Informe o código-fonte ou a referência da imagem.</p>}
              <Link to="/aplicacoes" className="btn-ghost w-full justify-center">
                Cancelar
              </Link>
            </div>
          </Panel>
        </div>
      </div>
    </>
  )
}
