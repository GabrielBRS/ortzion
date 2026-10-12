import { DESTINOS } from '../config/destinos';
import type { PortalProduct } from '../i18n/portal';

export function ProductCard({ product, externalLabel }: { product: PortalProduct; externalLabel: string }) {
  return (
    <a className={`product-card product-card--${product.key}`} href={DESTINOS[product.key]}>
      <div className="product-card__topline">
        {product.key === 'aiCloud' && (
          <svg className="product-card__icon" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M20 15v8M9 27v-4h22v4" />
            <rect x="13" y="3" width="14" height="12" rx="3" />
            <rect x="2" y="27" width="14" height="10" rx="3" />
            <rect x="24" y="27" width="14" height="10" rx="3" />
          </svg>
        )}
        <span className="product-card__status"><i aria-hidden="true" />{product.status}</span>
      </div>
      <p className="product-card__family">{product.family}</p>
      <h3>{product.name}</h3>
      <p className="product-card__description">{product.description}</p>
      <ul className="capability-list" aria-label={product.name}>
        {product.capabilities.map(capability => <li key={capability}>{capability}</li>)}
      </ul>
      <span className="product-card__cta">
        <span>{product.cta}<span className="sr-only"> ({externalLabel})</span></span>
        <b aria-hidden="true">↗</b>
      </span>
      {product.note && <small className="product-card__note">{product.note}</small>}
    </a>
  );
}
