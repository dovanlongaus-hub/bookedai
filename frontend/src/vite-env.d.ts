/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  /** OpenClaw bridge public prefix, e.g. http://127.0.0.1:18810/public */
  readonly VITE_OPENCLAW_PUBLIC_CHAT_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
