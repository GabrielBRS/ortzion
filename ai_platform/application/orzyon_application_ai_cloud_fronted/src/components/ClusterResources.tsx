import type { Cluster } from '../domain/types'
import { useApp } from '../state/AppContext'
import { clusterReserved, clusterTotals } from '../lib/capacity'
import { currentUsage } from '../lib/metrics'
import { fmtNum } from '../lib/format'
import { ResourceMeter } from './ui'
import { UnifiedMemoryBar } from './CapacityEditor'

/** Contratado, reservado e utilizado do cluster. Memória unificada sem dupla contagem. */
export function ResourceMeters({ cluster, compact }: { cluster: Cluster; compact?: boolean }) {
  const { data } = useApp()
  const t = clusterTotals(cluster.profile, cluster.capacity)
  const r = clusterReserved(data, cluster.id)
  const u = cluster.status === 'ativo' ? currentUsage(data, cluster.id) : { cpuUsed: 0, memUsedGiB: 0, gpuMemUsedGiB: 0, gpuPct: 0 }
  const unified = cluster.profile === 'unified'
  const n0 = (v: number) => fmtNum(v, 0)
  return (
    <div className="space-y-4">
      <ResourceMeter label="CPU" unit="vCPU" total={t.vcpu} reserved={r.vcpu} used={u.cpuUsed} format={(v) => fmtNum(v, 1)} />
      {unified ? (
        <>
          <UnifiedMemoryBar physical={t.physicalMemoryGiB} gpuShare={t.gpuMemoryGiB} gpuReserved={r.gpuMemoryGiB} cpuReserved={r.memoryGiB} />
          {!compact && (
            <div className="grid gap-4 sm:grid-cols-2">
              <ResourceMeter label="Parcela destinada à GPU" unit="GiB" total={t.gpuMemoryGiB} reserved={r.gpuMemoryGiB} used={u.gpuMemUsedGiB} format={n0} />
              <ResourceMeter label="Parcela de CPU e sistema" unit="GiB" total={t.cpuMemoryGiB} reserved={r.memoryGiB} used={u.memUsedGiB} format={n0} />
            </div>
          )}
        </>
      ) : (
        <>
          <ResourceMeter label="Memória RAM" unit="GiB" total={t.cpuMemoryGiB} reserved={r.memoryGiB} used={u.memUsedGiB} format={n0} />
          <ResourceMeter
            label="VRAM (memória dedicada das GPUs)"
            unit="GiB"
            total={t.gpuMemoryGiB}
            reserved={r.gpuMemoryGiB}
            used={u.gpuMemUsedGiB}
            format={n0}
            note={`${t.gpus} GPU × ${cluster.capacity.vramPerGpuGiB} GiB. Separada da RAM.`}
          />
        </>
      )}
      <ResourceMeter label={unified ? 'Unidades de GPU' : 'GPU'} unit="GPU" total={t.gpus} reserved={r.gpus} format={n0} />
      {!compact && <ResourceMeter label="Armazenamento" unit="GiB" total={t.storageGiB} reserved={t.storageGiB * 0.42} format={n0} note="Ocupação ilustrativa." />}
    </div>
  )
}

