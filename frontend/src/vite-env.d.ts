/// <reference types="vite/client" />
declare const __BUILD_ID__: string;
declare module "*.py?raw" {
  const src: string;
  export default src;
}
