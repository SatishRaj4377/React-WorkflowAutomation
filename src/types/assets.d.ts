declare module '*.docx' {
  const src: string;
  export default src;
}

declare module 'docx-preview' {
  const renderAsync: (buffer: ArrayBuffer, container: HTMLElement, styleContainer?: HTMLElement | undefined, options?: any) => Promise<void>;
  export default renderAsync;
}

declare module 'pizzip';
declare module 'docxtemplater';
