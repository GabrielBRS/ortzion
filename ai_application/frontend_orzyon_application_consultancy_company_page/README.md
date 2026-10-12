# Orzyon Consulting

Site B2B da consultoria Orzyon: desenvolvimento de produtos, sistemas de IA, arquitetura e integração aos produtos Orzyon e à Orzyon AI Cloud.

## Desenvolvimento e validação

Requer Node.js 24+, npm e Python 3.11+ para o deploy.

```bash
npm ci
npm start
npm test -- --watch=false
npm run build
```

Angular gera a página pré-renderizada em `dist/sgt_frontend_consultancy_company_page/browser`. A publicação usa Nginx estático; não requer um servidor Node em produção. A página é em português, com navegação por âncoras e layout responsivo.

O Cloudflare público reescreve endereços de e-mail no HTML. Por isso, `app-root` usa `ngSkipHydration`: mantém o conteúdo pré-renderizado e reconstrói o componente no cliente para evitar divergências de DOM durante a hidratação.

O briefing valida os campos e prepara um link `mailto:`. O visitante revisa e envia a mensagem no próprio aplicativo de e-mail. Não existe API de envio nem armazenamento dos dados do formulário. Os destinos do ecossistema e o e-mail ficam em `src/app/app.ts`.

## Publicação no Rancher / RKE2

- Site: https://consultancy.orzyon.ai/
- SSH: `gabrielsousa@2804:214:4013:31fc:c247:eff:fef6:801a`
- Namespace e deployment: `consultancy`
- Container: `consultancyorzyon-web`
- Service e Ingress existentes: `consultancy`
- Imagens: `local/orzyon-consultancy:<tag>`

```bash
python3 deploy/iac.py doctor
python3 deploy/iac.py deploy --dry-run
python3 deploy/iac.py deploy --host 2804:214:4013:31fc:c247:eff:fef6:801a --user gabrielsousa --no-prune --auto-rollback
python3 deploy/iac.py status
python3 deploy/iac.py rollback
```

O pipeline compila localmente, envia o artefato por SSH, constrói a imagem no servidor, importa no containerd e atualiza somente a imagem do container no deployment existente, com `imagePullPolicy: IfNotPresent`. Preserva os selectors do Rancher e os recursos de rede. Não execute `apply` para substituir esses recursos. A opção `--no-prune` preserva imagens anteriores; a verificação usa o Host do Ingress via Traefik e exige conteúdo da consultoria, além de HTTP 200.

Configuração em `deploy/iac.toml`; credenciais locais opcionais em `deploy/iac.local.toml` (ignorado pelo Git). O servidor usa RKE2. O pipeline detecta o runtime, resolve o caminho real de `/var/lib/rancher/rke2/bin/ctr` e usa o socket `/run/k3s/containerd/containerd.sock`, no namespace `k8s.io`. Requer Docker, kubectl e a permissão sudo já configurada para esse binário. Também mantém compatibilidade com k3s. Após uma atualização do RKE2, confira se a regra sudo continua cobrindo o binário ativo. O TLS público depende da infraestrutura de entrada existente.
