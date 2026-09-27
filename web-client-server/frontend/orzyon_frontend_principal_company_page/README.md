# ORZYON Technology — portal corporativo

Portal institucional e porta de entrada para todo o ecossistema ORZYON. A experiência apresenta a empresa, centraliza notícias, mantém login/cadastro dentro do portal e direciona visitantes aos produtos SmartFinance e MaisClinical.

## Stack

- React 19, TypeScript e React Router
- Vite 8
- Conteúdo em português, inglês e espanhol
- Metadados por rota, Open Graph, canonical e `hreflang`
- Build compatível com OpenAI Sites e fallback de SPA no worker

## Comandos

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Destinos externos

Os endereços ficam centralizados em `src/config/destinos.ts`. Para alterar os fallbacks sem editar o código, defina as variáveis documentadas em `.env.example`:

- `VITE_SITE_URL`
- `VITE_URL_PLATAFORMA`
- `VITE_URL_SMARTFINANCE`
- `VITE_URL_MAISCLINICAL`

`VITE_URL_PLATAFORMA` só é usado após o backend confirmar o login. Os botões públicos de acesso levam primeiro às telas internas do portal.

## Integração de autenticação

Defina `VITE_AUTH_API_URL` para habilitar os formulários. O frontend espera cookies de sessão seguros e estes contratos:

- `POST /v1/auth/session` → `204`
- `POST /v1/auth/registrations` → `202`
- `POST /v1/auth/password-reset-requests` → `202`

O portal não persiste senhas ou tokens no armazenamento web. O backend deve restringir CORS à origem oficial, aplicar rate limiting e CSRF quando necessário e emitir cookies de sessão `HttpOnly`, `Secure` e com `SameSite` adequado. O redirecionamento para a plataforma exige SSO por cookie compartilhado seguro ou um handoff de autorização de uso único — nunca credenciais ou JWT na URL.

## Estrutura principal

- `src/pages/Home.tsx` — entrada do portal, ecossistema, notícias, tecnologia e pesquisa
- `src/pages/Produtos.tsx` — diretório oficial de produtos e ambientes
- `src/pages/Tecnologia.tsx` — stack oficial Python, Mojo, Modern C++ e CUDA C++
- `src/pages/auth/` — login, cadastro e recuperação de senha
- `src/auth/authApi.ts` — contrato seguro com o backend de autenticação
- `src/i18n/portal.ts` — textos específicos do portal em PT/EN/ES
- `src/components/NewsCard.tsx` — notícias com destino interno, produto configurado ou qualquer URL HTTPS declarada no conteúdo
- `src/layout/` — navegação responsiva e rodapé do ecossistema
- `public/orzyon-identity.png` — identidade visual enviada para o portal
- `public/og.png` — cartão social da identidade atual
