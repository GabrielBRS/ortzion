import type { ClusterCapacity, ComputePool, ComputeProfile, Modality } from '../domain/types'
import { clusterTotals } from '../lib/capacity'
import { capacityMonthlyCost } from '../lib/costs'
import { fmtBRL, fmtBRL0, fmtGiB } from '../lib/format'
import { NumberSlider, Notice } from './ui'

export function defaultCapacity(pool: ComputePool, modality: Modality): ClusterCapacity {
  const p = pool.perNode
  const unified = pool.profile === 'unified'
  if (modality === 'dedicado')
    return {
      nodes: 1,
      vcpuPerNode: p.vcpu,
      memoryPerNodeGiB: p.memoryGiB,
      gpusPerNode: p.gpus,
      vramPerGpuGiB: p.vramPerGpuGiB,
      gpuSharePerNodeGiB: unified ? Math.round((p.memoryGiB * 0.75) / 8) * 8 : 0,
      storageGiB: 2048,
    }
  return {
    nodes: 1,
    vcpuPerNode: Math.min(32, p.vcpu),
    memoryPerNodeGiB: Math.min(256, p.memoryGiB),
    gpusPerNode: Math.min(2, p.gpus),
    vramPerGpuGiB: p.vramPerGpuGiB,
    gpuSharePerNodeGiB: unified ? 160 : 0,
    storageGiB: 1024,
  }
}

export function CapacityEditor({
  pool,
  modality,
  value,
  onChange,
}: {
  pool: ComputePool
  modality: Modality
  value: ClusterCapacity
  onChange: (c: ClusterCapacity) => void
}) {
  const unified = pool.profile === 'unified'
  const dedicated = modality === 'dedicado'
  const p = pool.perNode
  const set = (patch: Partial<ClusterCapacity>) => {
    const next = { ...value, ...patch }
    if (unified) next.gpuSharePerNodeGiB = Math.min(next.gpuSharePerNodeGiB, Math.max(0, next.memoryPerNodeGiB - 16))
    onChange(next)
  }
  const maxNodes = Math.min(dedicated ? 6 : 4, pool.nodes)

  return (
    <div className="space-y-5">
      <NumberSlider
        label="Quantidade de nós"
        value={value.nodes}
        min={1}
        max={maxNodes}
        unit={value.nodes > 1 ? 'nós' : 'nó'}
        onChange={(v) => set({ nodes: v })}
        hint="Cada nó é uma máquina separada. Cargas são alocadas dentro de um único nó."
      />
      {dedicated && (
        <Notice>
          Na modalidade dedicada, cada nó é uma máquina inteira e exclusiva do pool: {p.vcpu} vCPU, {fmtGiB(p.memoryGiB)} {unified ? 'de memória unificada' : 'de RAM'}
          {p.gpus > 0 && `, ${p.gpus} GPU${unified ? '' : ` × ${p.vramPerGpuGiB} GiB VRAM`}`}.
        </Notice>
      )}
      <div className="grid gap-5 md:grid-cols-2">
        <NumberSlider label="vCPU por nó" value={value.vcpuPerNode} min={4} max={p.vcpu} step={4} unit="vCPU" disabled={dedicated} onChange={(v) => set({ vcpuPerNode: v })} />
        <NumberSlider
          label={unified ? 'Memória unificada por nó (total físico)' : 'Memória RAM por nó'}
          value={value.memoryPerNodeGiB}
          min={32}
          max={p.memoryGiB}
          step={16}
          unit="GiB"
          disabled={dedicated}
          onChange={(v) => set({ memoryPerNodeGiB: v })}
        />
        <NumberSlider
          label={unified ? 'Unidades de GPU por nó' : 'GPUs por nó'}
          value={value.gpusPerNode}
          min={0}
          max={p.gpus}
          unit="GPU"
          disabled={dedicated}
          onChange={(v) => set({ gpusPerNode: v, gpuSharePerNodeGiB: v === 0 ? 0 : value.gpuSharePerNodeGiB })}
          hint={!unified && p.vramPerGpuGiB ? `Cada GPU possui ${p.vramPerGpuGiB} GiB de VRAM própria.` : undefined}
        />
        {unified && (
          <NumberSlider
            label="Parcela destinada à GPU por nó"
            value={value.gpuSharePerNodeGiB}
            min={0}
            max={Math.max(0, value.memoryPerNodeGiB - 16)}
            step={8}
            unit="GiB"
            disabled={value.gpusPerNode === 0}
            onChange={(v) => set({ gpuSharePerNodeGiB: v })}
            hint="Sai do mesmo total físico; o restante fica para CPU e sistema."
          />
        )}
        <NumberSlider label="Armazenamento" value={value.storageGiB} min={256} max={16384} step={256} unit="GiB" onChange={(v) => set({ storageGiB: v })} />
      </div>
      {unified && <UnifiedMemoryBar physical={value.memoryPerNodeGiB} gpuShare={value.gpuSharePerNodeGiB} perNode nodes={value.nodes} />}
    </div>
  )
}

/** Barra única para memória unificada: um total físico dividido entre GPU e CPU. */
export function UnifiedMemoryBar({
  physical,
  gpuShare,
  gpuReserved,
  cpuReserved,
  perNode,
  nodes,
}: {
  physical: number
  gpuShare: number
  gpuReserved?: number
  cpuReserved?: number
  perNode?: boolean
  nodes?: number
}) {
  const pct = (v: number) => (physical ? (v / physical) * 100 : 0)
  const cpuShare = physical - gpuShare
  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2 text-xs">
        <span className="font-medium">Memória unificada {perNode ? 'por nó' : ''}</span>
        <span className="num text-muted">
          {fmtGiB(physical)} físicos {perNode && nodes && nodes > 1 ? `× ${nodes} nós` : ''}
        </span>
      </div>
      <div className="flex h-3 overflow-hidden rounded-full bg-surface-3" role="img" aria-label={`Memória unificada: ${fmtGiB(gpuShare)} para GPU e ${fmtGiB(cpuShare)} para CPU, total ${fmtGiB(physical)}`}>
        <div className="relative h-full bg-violet/35" style={{ width: `${pct(gpuShare)}%` }}>
          {gpuReserved !== undefined && <div className="absolute inset-y-0 left-0 bg-violet" style={{ width: `${gpuShare ? Math.min(100, (gpuReserved / gpuShare) * 100) : 0}%` }} />}
        </div>
        <div className="relative h-full border-l-2 border-bg bg-accent/25" style={{ width: `${pct(cpuShare)}%` }}>
          {cpuReserved !== undefined && <div className="absolute inset-y-0 left-0 bg-accent" style={{ width: `${cpuShare ? Math.min(100, (cpuReserved / cpuShare) * 100) : 0}%` }} />}
        </div>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-subtle">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-violet" /> Destinada à GPU: {fmtGiB(gpuShare)}
          {gpuReserved !== undefined && ` (${fmtGiB(gpuReserved)} reservados)`}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-accent" /> CPU e sistema: {fmtGiB(cpuShare)}
          {cpuReserved !== undefined && ` (${fmtGiB(cpuReserved)} reservados)`}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-subtle">A parcela de GPU e a de CPU são o mesmo orçamento físico; o total nunca é somado duas vezes.</p>
    </div>
  )
}

export function CapacitySummary({ profile, modality, capacity, compare }: { profile: ComputeProfile; modality: Modality; capacity: ClusterCapacity; compare?: ClusterCapacity }) {
  const t = clusterTotals(profile, capacity)
  const cost = capacityMonthlyCost(profile, modality, capacity)
  const before = compare ? capacityMonthlyCost(profile, modality, compare) : null
  const tb = compare ? clusterTotals(profile, compare) : null
  const unified = profile === 'unified'
  const rows: [string, string, string?][] = [
    ['Nós', `${capacity.nodes}`, tb ? `${compare!.nodes}` : undefined],
    ['vCPU total', `${t.vcpu}`, tb ? `${tb.vcpu}` : undefined],
    ...(unified
      ? ([
          ['Memória unificada (física)', fmtGiB(t.physicalMemoryGiB), tb ? fmtGiB(tb.physicalMemoryGiB) : undefined],
          ['  · destinada à GPU', fmtGiB(t.gpuMemoryGiB), tb ? fmtGiB(tb.gpuMemoryGiB) : undefined],
          ['  · CPU e sistema', fmtGiB(t.cpuMemoryGiB), tb ? fmtGiB(tb.cpuMemoryGiB) : undefined],
        ] as [string, string, string?][])
      : ([
          ['RAM', fmtGiB(t.cpuMemoryGiB), tb ? fmtGiB(tb.cpuMemoryGiB) : undefined],
          ['VRAM (dedicada)', fmtGiB(t.gpuMemoryGiB), tb ? fmtGiB(tb.gpuMemoryGiB) : undefined],
        ] as [string, string, string?][])),
    ['GPU', `${t.gpus}`, tb ? `${tb.gpus}` : undefined],
    ['Armazenamento', fmtGiB(t.storageGiB), tb ? fmtGiB(tb.storageGiB) : undefined],
  ]
  return (
    <div className="space-y-3 text-sm">
      <table className="w-full">
        {compare && (
          <thead>
            <tr className="text-xs text-subtle">
              <th className="pb-1.5 text-left font-normal">Recurso</th>
              <th className="pb-1.5 text-right font-normal">Atual</th>
              <th className="pb-1.5 text-right font-normal">Novo</th>
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map(([k, v, old]) => (
            <tr key={k} className="border-b border-line/60 last:border-0">
              <td className="py-1.5 whitespace-pre text-muted">{k}</td>
              {compare && <td className="num py-1.5 text-right text-subtle">{old}</td>}
              <td className={`num py-1.5 text-right ${compare && old !== v ? 'font-medium text-accent' : ''}`}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="rounded-lg border border-line bg-surface-2 p-3">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-muted">Capacidade reservada estimada</span>
          <span className="num text-lg font-semibold">
            {fmtBRL0(cost.total)}
            <span className="text-xs font-normal text-subtle">/mês</span>
          </span>
        </div>
        {before && (
          <p className={`num mt-1 text-right text-xs ${cost.total > before.total ? 'text-warn' : 'text-ok'}`}>
            {cost.total >= before.total ? '+' : '−'}
            {fmtBRL(Math.abs(cost.total - before.total))} em relação ao atual ({fmtBRL0(before.total)})
          </p>
        )}
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-subtle">
          <dt>vCPU</dt>
          <dd className="num text-right">{fmtBRL0(cost.vcpu)}</dd>
          <dt>Memória</dt>
          <dd className="num text-right">{fmtBRL0(cost.memory)}</dd>
          <dt>GPU</dt>
          <dd className="num text-right">{fmtBRL0(cost.gpu)}</dd>
          <dt>Armazenamento</dt>
          <dd className="num text-right">{fmtBRL0(cost.storage)}</dd>
        </dl>
        <p className="mt-2 text-[11px] text-subtle">Estimativa ilustrativa. Consumo variável (gateway, transferência, logs) é cobrado à parte.</p>
      </div>
    </div>
  )
}
