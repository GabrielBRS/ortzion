# Ortzion — página legada de migração

Landing page em React mantida em `https://ortzion.com/` para orientar visitantes, recrutadores e contatos antigos ao domínio atual da empresa: `https://orzyon.ai/`.

## Stack

- React 19 e TypeScript
- Vite 8
- Nginx em container
- Deploy no RKE2/Rancher pelo orquestrador em `deploy/iac.py`

## Desenvolvimento

```bash
npm install
npm run dev
npm run build
```

## Deploy do domínio legado

O arquivo `deploy/iac.toml` aponta para os recursos atuais mostrados no Rancher:

- Namespace: `ortzion`
- Deployment: `ortzion`
- Container: `ortzion-web`
- Ingress: `ortzion.com`

```bash
python3 deploy/iac.py doctor
python3 deploy/iac.py status
python3 deploy/iac.py deploy --force
```

O deploy gera o build React localmente, cria a imagem Nginx, publica no nó RKE2 e acompanha o rollout antes de verificar o domínio legado.
