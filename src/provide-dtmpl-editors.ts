import { makeEnvironmentProviders, provideAppInitializer, type EnvironmentProviders } from '@angular/core';
import { FileEditorRegistry } from '@coolms/ui-angular';
import { DDOC_DOCUMENT_MIME } from './ddoc-document.service';
import { DtmplEditorDialogComponent } from './dtmpl-editor-dialog.component';

/**
 * Registers this package's dialog as the file editor for the DTMPL formats.
 *
 * `text/x-dtmpl` -- a template body, standalone or a variant. The registry
 * resolves an exact mime before the `text/*` wildcard, so this wins over the
 * code editor a host registers for text.
 *
 * `application/x-coolms-document+json` -- the native document. The EXACT
 * registration is required, not decoration: the registry's wildcard fallback
 * is the mime's first segment plus `/*` -- `application/*` -- which nothing
 * registers, so a `.ddoc` would otherwise miss every lookup and open in the
 * code editor, which is where it landed before this line existed.
 *
 * An initializer rather than a module side effect: a registration that runs on
 * import happens when the bundler decides, which is the difference between a
 * file opening in this editor and opening in the code editor.
 */
export function provideDtmplEditors(): EnvironmentProviders {
    return makeEnvironmentProviders([
        provideAppInitializer(() => {
            FileEditorRegistry.register('text/x-dtmpl', { component: DtmplEditorDialogComponent });
            FileEditorRegistry.register(DDOC_DOCUMENT_MIME, { component: DtmplEditorDialogComponent });
        }),
    ]);
}
