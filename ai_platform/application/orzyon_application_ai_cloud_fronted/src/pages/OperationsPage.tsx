import { useState } from 'react'
import { ModelTariffs } from '../components/ModelTariffs'
import { Layers } from 'lucide-react'
import { useApp } from '../state/AppContext'
import { Badge, MetricCard, Notice, PageHeader, Panel, ResourceMeter, StatusBadge } from '../components/ui'
import { DonutChart } from '../components/charts'
import { poolUsage } from '../lib/capacity'
import { fmtGiB, fmtNum, fmtPct } from '../lib/format'
import { modalityLabel, profileLabel } from '../lib/labels'

// Área global da Orzyon Cloud (operador). Separada da experiência das organizações clientes.
export default function OperationsPage() {
  const { data } = useApp()
  const [poolId, setPoolId] = useState(data.pools[0]?.id ?? '')
  const usages = data.pools.map((p) => ({ pool: p, usage: poolUsage(data, p) }))
  const selected = usages.find((u) => u.pool.id === poolId) ?? usages[0]

  const totalNodes = data.pools.reduce((s, p) => s + p.nodes, 0)
  const totalVcpu = usages.reduce((s, u) => s + u.usage.vcpu.total, 0)
  const allocVcpu = usages.reduce((s, u) => s + u.usage.vcpu.allocated, 0)
  const totalGpus = usages.reduce((s, u) => s + u.usage.gpus.total, 0)
  const allocGpus = usages.reduce((s, u) => s + u.usage.gpus.allocated, 0)

  const byOrg = selected
    ? data.orgs
        .map((o) => ({
          name: o.name,
          value: selected.usage.clusters.filter((c) => c.orgId === o.id).reduce((s, c) => s + c.capacity.nodes * c.capacity.vcpuPerNode, 0),
        }))
        .filter((x) => x.value > 0)
    : []

  return (
    <>
      <PageHeader
        title="Operação da cloud"
        badge={<Badge tone="violet">Perfil operador</Badge>}
        description="Visão global da infraestrutura operada pela Orzyon Cloud: pools de computação, nós e alocação entre organizações."
        crumbs={[{ label: 'Orzyon Cloud' }, { label: 'Operação' }]}
      />
      <div className="mb-4">
        <Notice>
          Esta área é da operação da plataforma Orzyon Cloud e não se confunde com a organização cliente “Orzyon”. Na simulação, somente o perfil operador a visualiza — comportamento de
          interface, não um controle de segurança.
        </Notice>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <MetricCard label="Pools" value={data.pools.length} icon={<Layers className="size-4" />} />
        <MetricCard label="Nós físicos" value={totalNodes} hint={`${data.pools.reduce((s, p) => s + p.nodesDegraded, 0)} em manutenção`} />
        <MetricCard label="Organizações atendidas" value={data.orgs.length} hint={`${data.clusters.length} clusters`} />
        <MetricCard label="vCPU alocada" value={fmtPct(allocVcpu / totalVcpu)} hint={`${fmtNum(allocVcpu)} de ${fmtNum(totalVcpu)}`} />
        <MetricCard label="GPU alocada" value={fmtPct(allocGpus / totalGpus)} hint={`${allocGpus} de ${totalGpus}`} />
      </div>

      <Panel title="Pools de computação" className="mt-4" bodyClassName="">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-line">
              <tr>
                <th className="th">Pool</th>
                <th className="th">Saúde</th>
                <th className="th">Perfil</th>
                <th className="th text-right">Nós</th>
                <th className="th">vCPU alocada</th>
                <th className="th">Memória alocada</th>
                <th className="th">GPU alocada</th>
                <th className="th text-right">Clusters</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {usages.map(({ pool, usage }) => (
                <tr
                  key={pool.id}
                  className={`cursor-pointer hover:bg-surface-2/50 ${pool.id === selected?.pool.id ? 'bg-surface-2/60' : ''}`}
                  onClick={() => setPoolId(pool.id)}
                >
                  <td className="td">
                    <button className="text-left font-medium hover:text-accent" onClick={() => setPoolId(pool.id)} aria-pressed={pool.id === selected?.pool.id}>
                      {pool.name}
                    </button>
                    <div className="text-xs text-subtle">{pool.region}</div>
                  </td>
                  <td className="td">
                    <StatusBadge status={pool.health} />
                  </td>
                  <td className="td">{profileLabel(pool.profile)}</td>
                  <td className="td num text-right">
                    {pool.nodes}
                    {pool.nodesDegraded > 0 && <span className="block text-xs text-warn">{pool.nodesDegraded} em manutenção</span>}
                  </td>
                  <td className="td num text-xs">
                    {fmtNum(usage.vcpu.allocated)} / {fmtNum(usage.vcpu.total)} ({fmtPct(usage.vcpu.allocated / usage.vcpu.total)})
                  </td>
                  <td className="td num text-xs">
                    {fmtGiB(usage.memory.allocated)} / {fmtGiB(usage.memory.total)}
                  </td>
                  <td className="td num text-xs">
                    {usage.gpus.allocated} / {usage.gpus.total}
                  </td>
                  <td className="td num text-right">{usage.clusters.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {selected && (
        <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr_320px]">
          <Panel title={selected.pool.name} description={selected.pool.hardware}>
            <div className="space-y-4">
              <ResourceMeter label="vCPU" unit="vCPU" total={selected.usage.vcpu.total} reserved={selected.usage.vcpu.allocated} format={(v) => fmtNum(v)} />
              <ResourceMeter
                label={selected.pool.profile === 'unified' ? 'Memória unificada (total físico)' : 'Memória RAM'}
                unit="GiB"
                total={selected.usage.memory.total}
                reserved={selected.usage.memory.allocated}
                format={(v) => fmtNum(v)}
                note={selected.pool.profile === 'unified' ? 'Um único orçamento físico por nó; a parcela de GPU é definida por cluster.' : undefined}
              />
              {selected.pool.profile === 'dedicated_gpu' && (
                <ResourceMeter
                  label="VRAM"
                  unit="GiB"
                  total={selected.usage.gpus.total * selected.pool.perNode.vramPerGpuGiB}
                  reserved={selected.usage.gpus.allocated * selected.pool.perNode.vramPerGpuGiB}
                  format={(v) => fmtNum(v)}
                  note={`${selected.pool.perNode.vramPerGpuGiB} GiB por GPU, separada da RAM.`}
                />
              )}
              <ResourceMeter label={selected.pool.profile === 'unified' ? 'Unidades de GPU' : 'GPU'} unit="GPU" total={selected.usage.gpus.total} reserved={selected.usage.gpus.allocated} format={(v) => fmtNum(v)} />
              <p className="text-xs text-subtle">
                Por nó: {selected.pool.perNode.vcpu} vCPU · {fmtGiB(selected.pool.perNode.memoryGiB)} {selected.pool.profile === 'unified' ? 'unificada' : 'RAM'} ·{' '}
                {selected.pool.perNode.gpus} GPU
                {selected.pool.perNode.vramPerGpuGiB ? ` × ${selected.pool.perNode.vramPerGpuGiB} GiB` : ''}
              </p>
            </div>
          </Panel>
          <Panel title="Clusters atendidos" bodyClassName="divide-y divide-line">
            {selected.usage.clusters.length === 0 && <p className="p-4 text-sm text-muted">Nenhum cluster neste pool.</p>}
            {selected.usage.clusters.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{c.name}</p>
                  <p className="text-xs text-subtle">
                    {data.orgs.find((o) => o.id === c.orgId)?.name} · {modalityLabel(c.modality)} · {c.capacity.nodes}× ({c.capacity.vcpuPerNode} vCPU, {fmtGiB(c.capacity.memoryPerNodeGiB)},{' '}
                    {c.capacity.gpusPerNode} GPU)
                  </p>
                </div>
                <StatusBadge status={c.status} />
              </div>
            ))}
          </Panel>
          <Panel title="Distribuição por organização" description="vCPU alocada no pool">
            {byOrg.length ? (
              <>
                <DonutChart data={byOrg} format={(v) => `${fmtNum(v)} vCPU`} />
                <ul className="mt-2 space-y-1 text-xs">
                  {byOrg.map((o, i) => (
                    <li key={o.name} className="flex justify-between gap-2">
                      <span className="flex items-center gap-2 text-muted">
                        <span className="size-2.5 rounded-sm" style={{ background: ['#22c3e6', '#a78bfa', '#34d399', '#fbbf24'][i % 4] }} />
                        {o.name}
                      </span>
                      <span className="num">{fmtNum(o.value)} vCPU</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm text-muted">Sem alocações.</p>
            )}
          </Panel>
        </div>
      )}
      <div className="mt-8">
        <h2 className="mb-1 text-lg font-semibold">Tarifas de modelos</h2>
        <p className="mb-4 text-sm text-muted">Custo dos fornecedores e multiplicador ficam na administração da Orzyon. O cliente vê apenas o preço final, a unidade e as condições.</p>
        <ModelTariffs />
      </div>
    </>
  )
}
