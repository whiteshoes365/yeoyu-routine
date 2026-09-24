/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_APP_VERSION: string
  readonly VITE_PADDLE_CLIENT_TOKEN?: string
  readonly VITE_PADDLE_PRICE_ID_PRO_MONTHLY?: string
  readonly VITE_PADDLE_ENV?: string
  readonly VITE_PADDLE_CUSTOMER_PORTAL_URL?: string
  readonly VITE_ALLOW_MOCK_SUB?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
