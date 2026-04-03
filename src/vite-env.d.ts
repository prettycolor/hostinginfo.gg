/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME: string;
  readonly VITE_PUBLIC_URL: string;
  readonly VITE_API_URL: string;
  readonly VITE_ENABLE_SOURCE_MAPPING: string;
  readonly VITE_ENABLE_SSR: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
