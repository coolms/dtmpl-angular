# Changelog

All notable changes to `@coolms/dtmpl-angular` are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

This file starts at the first version of the package. Nothing is published
yet; entries are written in the same commit as the work they describe.

## Unreleased

### Changed

- The package declares its own toolchain (the Angular compiler, ng-packagr,
  TypeScript, ESLint) as devDependencies. It had none: inside the CoolMS
  workspace it borrowed the admin application's node_modules through a
  symlink, so a clean checkout -- CI among them -- could not lint or build it
  (`eslint: not found`). Nothing a consumer installs changes.

### Added

- The package, extracted from the admin theme's shell: `DtmplEditorDialogComponent`
  (the editor for `.dtmpl` and `.ddoc` sources over the CoolMS editor bridge --
  split preview, paper, footnotes, Word and PDF download), `DdocDocumentService`
  with the native document format's mime, section join and split, footnote
  references and paper rules, `DdocFootnotesPanelComponent`,
  `DocumentPageSizeService` and `DocumentPreviewService`, and
  `provideDtmplEditors()`, which registers the dialog with `FileEditorRegistry`
  for `text/x-dtmpl` and for `application/x-coolms-document+json`.
- `DTMPL_CONTENT_ADAPTER`, the token through which a host supplies the widget
  translation. A `.dtmpl` body stores `{widget:media:UUID ...}` tokens and what
  one resolves to is the application's business; the dialog renders without
  translation when nothing provides an adapter, instead of requiring the
  content module the admin happens to have.
