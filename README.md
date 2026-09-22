# @coolms/dtmpl-angular

The CoolMS DTMPL editor for Angular: the dialog that edits `.dtmpl` and
`.ddoc` sources over the CoolMS editor bridge, the native document format's
sections and footnotes, and the paper and preview services around them.

DTMPL is the platform's template language, and several modules edit it -- a
page, a document template, a mail body, a form's confirmation. The editor for
it belongs beside `@coolms/editor-angular` rather than inside any one of them.

## Install

```bash
npm install @coolms/dtmpl-angular @coolms/editor-angular @coolms/core-angular
```

Angular, NGXS, RxJS and `@angular/cdk` are peers, as are `@coolms/ui-angular`
(the file-editor registry, the context frame, the toasts and the unsaved-changes
guard) and `@coolms/pdf-angular` (the paper preview). The supported ranges are
declared in `package.json`, which is what an install actually checks.

## Use

```ts
import { provideDtmplEditors } from '@coolms/dtmpl-angular';

export const appConfig: ApplicationConfig = {
    providers: [
        provideDtmplEditors(),
    ],
};
```

That registers the dialog with `FileEditorRegistry` for `text/x-dtmpl` and for
`application/x-coolms-document+json`, so double-clicking either kind of file in
the file manager opens it.

### The widget translation is the host's

A `.dtmpl` body stores widgets as `{widget:media:UUID ...}` tokens, and what a
token resolves to -- an asset, a link, a form, an image map -- is the hosting
application's business, not this package's. The dialog asks for a
`ContentAdapter` through `DTMPL_CONTENT_ADAPTER` and renders without widget
translation when nothing provides one:

```ts
{ provide: DTMPL_CONTENT_ADAPTER, useExisting: MyDtmplContentAdapter }
```

## The native document format

`.ddoc` is a JSON document whose body carries the same DTMPL tokens. This
package holds its mime (`DDOC_DOCUMENT_MIME`), the section join and split the
editor serialises across page breaks, the footnote references and the paper
rules (`DdocDocumentService`), the footnotes panel, and the two services that
ask the server for page sizes and for a paper-accurate preview.

## Status

A pre-release line, `2.0.0-alpha.N`, published nowhere yet. It carries no
compatibility promise: names and shapes may change between alphas.
