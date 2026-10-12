// Endpoint do modelo de linguagem da Orzyon e geração de chaves de API.
// Demonstração: o domínio é o de produção, mas o gateway ainda não está publicado. As chaves são geradas
// no navegador e não são validadas por um serviço real.
export const GATEWAY_URL = 'https://si-model.orzyon.ai/v1'

export const KEY_PREFIX = 'orz_sk_'
const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

/** Segredo de 40 caracteres. Usa a criptografia do navegador quando existe; o fallback só serve para testes. */
export function generateApiKey(): string {
  const bytes = new Uint8Array(40)
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes)
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
  return KEY_PREFIX + Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')
}
