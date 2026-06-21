/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base del backend en producción, incluyendo /api/v1.
   *  En desarrollo se deja sin definir y se usa el proxy de Vite. */
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
