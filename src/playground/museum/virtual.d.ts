// Virtual module of the museum plugin (build/plugin.ts): the sheet data the page's JavaScript
// needs. The declaration is checked in so that `tsc --noEmit` does not depend on a generated
// file.
declare module 'virtual:museum' {
  const data: import('./build/render').RuntimeData;
  export default data;
}
