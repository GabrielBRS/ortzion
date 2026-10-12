/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SITE_URL?: string;
  readonly VITE_AUTH_API_URL?: string;
  readonly VITE_URL_PLATAFORMA?: string;
  readonly VITE_URL_SMARTFINANCE?: string;
  readonly VITE_URL_MAISCLINICAL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
