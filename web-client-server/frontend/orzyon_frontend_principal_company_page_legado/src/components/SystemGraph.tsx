import type { PortalCopy } from '../i18n/portal';

export function SystemGraph({ copy }: { copy: PortalCopy['graph'] }) {
  return (
    <figure className="system-graph" aria-label={copy.aria}>
      <div className="system-graph__topbar">
        <span>{copy.label}</span>
        <span className="system-graph__status"><i />{copy.status}</span>
      </div>

      <div className="system-graph__canvas">
        <svg className="system-graph__lines" viewBox="0 0 600 480" aria-hidden="true">
          <defs>
            <linearGradient id="graph-line" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#126bff" stopOpacity="0.14" />
              <stop offset="0.5" stopColor="#4aa3ff" stopOpacity="0.82" />
              <stop offset="1" stopColor="#126bff" stopOpacity="0.14" />
            </linearGradient>
          </defs>
          <path className="system-graph__path path-1" d="M300 240 L120 100" />
          <path className="system-graph__path path-2" d="M300 240 L480 90" />
          <path className="system-graph__path path-3" d="M300 240 L520 300" />
          <path className="system-graph__path path-4" d="M300 240 L330 420" />
          <path className="system-graph__path path-5" d="M300 240 L80 330" />
          <path className="system-graph__path path-6" d="M120 100 L480 90 L520 300 L330 420 L80 330 Z" />
          <circle className="system-graph__orbit" cx="300" cy="240" r="128" />
          <circle className="system-graph__orbit system-graph__orbit--outer" cx="300" cy="240" r="188" />
        </svg>

        <div className="graph-node graph-node--core">
          <span>CORE / 00</span>
          <strong>{copy.center}</strong>
          <i aria-hidden="true" />
        </div>
        <div className="graph-node graph-node--agents"><span>01</span><strong>{copy.agents}</strong></div>
        <div className="graph-node graph-node--models"><span>02</span><strong>{copy.models}</strong></div>
        <div className="graph-node graph-node--vision"><span>03</span><strong>{copy.vision}</strong></div>
        <div className="graph-node graph-node--robotics"><span>04</span><strong>{copy.robotics}</strong></div>
        <div className="graph-node graph-node--compute"><span>05</span><strong>{copy.compute}</strong></div>
      </div>

      <div className="system-graph__footer" aria-hidden="true">
        <span>LATENCY / OPTIMIZED</span>
        <span>CONTROL / PRIVATE</span>
        <span>SCALE / DISTRIBUTED</span>
      </div>
    </figure>
  );
}

