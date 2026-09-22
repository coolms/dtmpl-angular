import { InjectionToken } from '@angular/core';
import type { ContentAdapter } from '@coolms/editor-angular';

/**
 * The widget translation for a DTMPL body, supplied by the host.
 *
 * A `.dtmpl` body stores widgets as `{widget:media:UUID ...}` tokens, and what
 * a token resolves to -- an asset with its preset URLs, a link to a page, a
 * form, an image map -- is the hosting application's business. This package
 * edits the body; it does not know the catalogue behind any namespace, and a
 * dialog that imported one would drag the module that owns it into every
 * consumer.
 *
 * Optional on purpose. With no adapter the editor sees the stored text as it
 * is: the tokens show as tokens rather than as rendered widgets, which is a
 * usable editor for a body that has none, and is what a host installing this
 * package without the media, link, form and image-map modules should get --
 * rather than a null dereference, or a hard dependency it did not ask for.
 *
 * The admin provides its Content module's `DtmplContentAdapter` here, through
 * that module's console entry, so the binding exists exactly when the module
 * does.
 */
export const DTMPL_CONTENT_ADAPTER = new InjectionToken<ContentAdapter>('coolms.dtmpl.contentAdapter');
