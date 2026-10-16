# Changelog

All notable changes to `@coolms/dtmpl-angular` are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

This file starts at the first version of the package. Nothing is published
yet; entries are written in the same commit as the work they describe.

## Unreleased

### Fixed

- A document, `.dtmpl` or `.ddoc`, is saved only over the version it was
  read at. The editor reads the content and its version (`contentHash`) in
  one read, and every save sends that version as `If-Match`. A file saved
  by someone else since is refused (412), and one deleted since is not made
  again (404). The editor says so and offers Reload or Save as a copy, and
  never retries or merges on its own. A read that names no version is never
  saved over. Before, a save overwrote whatever was there, so of two people
  editing one file the later save silently replaced the earlier one.
- Save as a copy never replaces a file of that name (409), and the editor
  then edits the copy. A `.dtmpl` copy is the editor's own text, written
  with overwrite off. A `.ddoc` copy is composed by the server from the
  original at the version the editor read plus its edits, so no edit made
  since is merged in. There is no copy of a `.ddoc` that is gone or that
  named no version; the notice says that Download as .docx keeps the edits.
- `DdocDocumentService.write()` takes the version to save over, and
  `read()` answers it (`DdocRead`); `copy()` is new.
- A document whose read failed, `.dtmpl` or `.ddoc`, opens no editor: the
  notice says it could not be read and offers Reload, and Save is off.
  Before, both left an empty, editable editor, and its Save wrote over the
  file (for a `.ddoc`, over its first section).

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
