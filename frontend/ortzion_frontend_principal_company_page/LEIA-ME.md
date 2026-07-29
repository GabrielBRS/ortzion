# Site institucional Ortzion — esqueleto v2 (trilíngue)

Overlay para o projeto Angular `ortzion_frontend_principal_company_page` (Angular 20+, SSR/prerender do `ng new`). A v2 adiciona **internacionalização PT/EN/ES**, as páginas **Ciência & Pesquisa** e **Notícias**, o **sol Ortzion** como símbolo e o tema de cor comutável.

## O que este pacote contém

**Substitui** (faça um commit antes de extrair):

- `src/index.html`, `src/styles.scss`
- `src/app/app.ts`, `app.html`, `app.scss`, `app.routes.ts`, `app.routes.server.ts`, `app.config.ts`
- `src/app/layout/{header,footer}` e `src/app/pages/{home,consultoria,servicos,produtos,contato}`

**Adiciona**:

- `src/app/core/i18n/` — tipos e slugs (`idiomas.ts`), contrato do conteúdo (`conteudo.ts`), dicionários (`conteudo-pt.ts`, `conteudo-en.ts`, `conteudo-es.ts`) e o serviço + resolver (`conteudo-service.ts`)
- `src/app/core/seo/` — `seo.ts` (title, description, OG, canonical, hreflang e `<html lang>` por página) e `app-title-strategy.ts`
- `src/app/pages/pesquisa` e `src/app/pages/noticias`
- `public/favicon.svg` (sol Ortzion), `public/robots.txt`, `public/sitemap.xml` (21 URLs)
- `deploy/Dockerfile`, `deploy/nginx.conf` (redirect por idioma) e `.dockerignore`

## Como o i18n funciona

- **Uma árvore de rotas por idioma**: `/pt`, `/en` e `/es`, com **slugs traduzidos** (`/en/consulting`, `/es/investigacion`…). Tudo definido em `core/i18n/idiomas.ts` (`SLUGS`).
- Cada árvore tem um **resolver** que faz `import()` só do dicionário daquele idioma — cada língua é um chunk separado, carregado sob demanda.
- **Para editar qualquer texto do site**, edite os três dicionários em `core/i18n/conteudo-*.ts`. A interface `ConteudoSite` (em `conteudo.ts`) garante que nenhuma chave falte em nenhum idioma — o compilador acusa.
- O **seletor PT · EN · ES** no header leva à mesma página no outro idioma (via `ConteudoService.linkPara`).
- SEO multilíngue por página: canonical + `hreflang` (pt/en/es + `x-default`) + `og:locale` + `<html lang>`, aplicados pelo `Seo` service — saem no HTML prerenderizado.
- `/` e rotas desconhecidas redirecionam para `/pt` no Angular; em produção, o **nginx responde `/` com 302 para `/pt/`, `/en/` ou `/es/`** conforme o `Accept-Language` do navegador (detecção simples: 1º idioma do header).
- Todas as rotas são literais, então o `**` → `RenderMode.Prerender` de `app.routes.server.ts` gera as **21 páginas estáticas** (3 idiomas × 7 páginas).

## Identidade visual

- Paleta ativa: **Solar** (tinta noturna + ouro heráldico). No topo de `src/styles.scss` há um bloco `TEMA DE ACENTO` com as paletas **Estelar** (azul) e **Lunar** (prata) prontas — para testar, troque o bloco descomentado (4 variáveis).
- O hero da home ganhou um **céu estrelado sutil** em CSS puro (`home.scss`), unindo o sol dourado às estrelas.
- O **sol Ortzion** (16 pétalas) é arte original em SVG — header e `public/favicon.svg`. A referência de banco de imagens enviada (Alamy) **não** foi reproduzida: para usá-la seria preciso licenciar; o SVG próprio elimina a questão.

## Como aplicar

1. Commit do estado atual: `git add -A && git commit -m "chore: pre-skeleton-v2"`.
2. Extraia o zip na **raiz do projeto**, mesclando pastas e sobrescrevendo quando perguntado. Se aplicou a v1 antes, pode extrair por cima — todos os arquivos da v1 são sobrescritos e nenhum fica órfão.
3. Fontes self-hosted (sem CDN):

   ```bash
   npm i @fontsource-variable/fraunces @fontsource-variable/public-sans @fontsource-variable/jetbrains-mono
   ```

   Depois descomente os três `@import` no topo de `src/styles.scss`. Sem instalar, os fallbacks (Georgia/system-ui) seguram o layout.
4. `app.config.ts`: se o original tinha `provideZonelessChangeDetection()`, recoloque a linha — tudo é OnPush/signals e funciona zoneless.
5. `src/app/app.spec.ts` testa o scaffold antigo e vai falhar — atualize ou remova.
6. `ng serve` e teste: `/pt`, `/en/consulting`, `/es/servicios`, o seletor de idioma e o menu mobile (colapsa em ≤1024px).

## Build, prerender e deploy no k3s

- `ng build` gera `dist/ortzion_frontend_principal_company_page/browser/` com o HTML das 21 páginas.
- Para SSG puro (recomendado), defina `"outputMode": "static"` no `angular.json`.
- Sirva **apenas** a pasta `browser/` — o nginx do `deploy/` já faz isso, com o redirect de idioma na raiz.

```bash
docker build -f deploy/Dockerfile -t registry.gitlab.com/gabriel-sousa-group/ortzion-site:v2 .
docker push registry.gitlab.com/gabriel-sousa-group/ortzion-site:v2
```

Depois: Deployment + Service + Ingress para `ortzion.com`/`www.ortzion.com` (ingressClass traefik), TLS ativo desde o primeiro deploy.

## TODOs de conteúdo

- `URL_SITE_CONSULTORIA` em `core/i18n/idiomas.ts` aponta para `https://consultoria.ortzion.com` — trocar pela URL real do site da consultoria.
- Substituir o sol provisório pelo emblema oficial (leão alado) quando ele existir — header e favicon.
- URL real do LinkedIn (footer, Contato e JSON-LD do `index.html` — placeholder `[SEU-PERFIL](https://www.linkedin.com/company/ortzion-technology)`).
- Gerar `public/og-cover.png` (1200×630) e descomentar a meta `og:image` no `index.html`.
- Editar/adicionar itens de **Notícias** nos três dicionários (`noticias.itens`).
- Revisar os textos de **Produtos** conforme o que for público sobre SmartFinance e MaisClinical.
- Os cases da home seguem **anonimizados de propósito** — antes de citar cliente nominalmente, obter autorização por escrito.
