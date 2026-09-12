/// <reference types="vite/client" />

/** Vite emits a bundled worker and resolves the import to its URL. */
declare module '*?worker&url' {
  const url: string;
  export default url;
}
