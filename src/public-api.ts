/**
 * The public surface of `@coolms/dtmpl-angular`.
 *
 * The dialog is what an application registers for the DTMPL formats --
 * `provideDtmplEditors()` does that -- and the rest is what a caller needs to
 * read or build a native document without opening it: the mime, the section
 * join and split, the footnote references and the paper rules.
 */
export * from './dtmpl-content-adapter';
export * from './dtmpl-editor-dialog.component';
export * from './ddoc-document.service';
export * from './ddoc-footnotes-panel.component';
export * from './document-page-size.service';
export * from './document-preview.service';
export * from './provide-dtmpl-editors';
