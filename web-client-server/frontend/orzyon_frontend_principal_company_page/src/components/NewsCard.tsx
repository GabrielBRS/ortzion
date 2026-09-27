import { Link } from 'react-router-dom';

import { DESTINOS } from '../config/destinos';
import type { ItemNoticia } from '../i18n/conteudo';
import type { Pagina } from '../i18n/idiomas';

interface NewsCardProps {
  item: ItemNoticia;
  linkPara: (pagina: Pagina) => string;
  externalLabel: string;
}

export function NewsCard({ item, linkPara, externalLabel }: NewsCardProps) {
  const external = item.destino.tipo !== 'pagina';
  const content = (
    <article>
      <div className="news-card__topline">
        <span>{item.data}</span>
        <i aria-hidden="true" />
      </div>
      <h3>{item.titulo}</h3>
      <p>{item.resumo}</p>
      <span className="news-card__cta">
        {item.rotulo}
        {external && (
          <span className="sr-only"> ({externalLabel})</span>
        )}
        <b aria-hidden="true">{external ? '↗' : '→'}</b>
      </span>
    </article>
  );

  if (item.destino.tipo === 'url') {
    return <a className="news-card" href={item.destino.url}>{content}</a>;
  }

  if (item.destino.tipo === 'produto') {
    const href = DESTINOS[item.destino.produto];
    return <a className="news-card" href={href}>{content}</a>;
  }

  return <Link className="news-card" to={linkPara(item.destino.pagina)}>{content}</Link>;
}
