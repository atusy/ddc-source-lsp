export {
  applyTextEdits,
  getCursor,
  isPositionBefore,
  LineContext,
  linePatch,
  makePositionParams,
  type OffsetEncoding,
  parseSnippet,
  toUtf16Index,
} from "https://deno.land/x/denops_lsputil@v0.9.3/mod.ts";

export * as LSP from "npm:vscode-languageserver-protocol@3.17.6-next.1";
