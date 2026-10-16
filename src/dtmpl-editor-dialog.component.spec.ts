import { HttpClientTestingModule, HttpTestingController, TestRequest } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { NgxsModule, Store } from '@ngxs/store';
import { of } from 'rxjs';
import { AppConfigState, ErrorHandlerService } from '@coolms/core-angular';
import {
    AuthoringContextService, ConfirmDialogService, NativeDialogService, ToastService, UnsavedChangesService,
    VfsWriteAccessService,
} from '@coolms/ui-angular';
import { DtmplEditorDialogComponent } from './dtmpl-editor-dialog.component';
import { DDOC_DOCUMENT_MIME } from './ddoc-document.service';
import { DocumentPageSizeService } from './document-page-size.service';
import { DocumentPreviewService } from './document-preview.service';

const BINARY = 'https://api.test/vfs/binary';

/** The dialog over stubs, opened on the node given; the editor surface and the previews are not rendered. */
function configure(node: Record<string, unknown>, dialogs: { input: () => Promise<string | null> }, discard: () => boolean): void {
    TestBed.configureTestingModule({
        imports: [HttpClientTestingModule, DtmplEditorDialogComponent, NgxsModule.forRoot([AppConfigState])],
        providers: [
            { provide: DIALOG_DATA, useValue: { node } },
            { provide: DialogRef, useValue: { close: (): void => {} } },
            { provide: NativeDialogService, useValue: dialogs },
            { provide: ConfirmDialogService, useValue: { confirmDiscard: () => of(discard()) } },
            { provide: ToastService, useValue: { success: (): void => {}, error: (): void => {} } },
            { provide: UnsavedChangesService, useValue: { watch: () => (): void => {} } },
            { provide: ErrorHandlerService, useValue: { humanize: () => 'refused' } },
            { provide: VfsWriteAccessService, useValue: { forNode: () => ({ writable: signal(true).asReadonly(), request: () => of(true) }) } },
            { provide: AuthoringContextService, useValue: { get: () => of({ themeSlug: null, css: [], js: [], contentMaxWidth: null }) } },
            { provide: DocumentPageSizeService, useValue: {} },
            { provide: DocumentPreviewService, useValue: {} },
        ],
    });
    // The editor surface and the previews are not what is under test, and they load a great deal.
    TestBed.overrideComponent(DtmplEditorDialogComponent, { set: { imports: [], schemas: [NO_ERRORS_SCHEMA] } });
    TestBed.inject(Store).reset({
        appConfig: {
            loaded: true,
            config: { manifest: { vfs: { fileContentUrl: 'https://api.test/vfs/content?path={path}', binaryWriteUrl: BINARY } } },
        },
    });
}

/**
 * A `.dtmpl` saves only over the version it was read at.
 *
 * The editor reads the content and its version in one read, and every save names that version (If-Match). A file
 * saved by someone else since is refused (412), one deleted since is not made again (404), and the editor then says
 * so and offers Reload or Save as a copy -- it never retries on its own and never merges. Two people editing one
 * file therefore never overwrite each other unseen, which is what the version is for.
 *
 * The server here is a fake that keeps one file the way the real one does: a save naming the current version is
 * applied and answers the new version; one naming another is refused 412; one naming none is applied unchecked, as
 * the real server still does for a client that sends none. The editor surface itself is not rendered: what is under
 * test is what reaches the file, and an edit reaches the dialog through `onContentChange`, as the editor emits it.
 */
describe('DtmplEditorDialogComponent -- saves over the version it read', () => {
    const PATH = '/pages/about.html/en.dtmpl';
    const URL = 'https://api.test/vfs/content?path=%2Fpages%2Fabout.html%2Fen.dtmpl';
    let httpMock: HttpTestingController;
    let copyName: string | null;
    let discard: boolean;

    /** The one file both sessions open, as the server holds it. */
    let stored: { content: string; hash: string; deleted: boolean };
    let saves: number;

    beforeEach(() => {
        copyName = 'en (copy).dtmpl';
        discard = true;
        stored = { content: '<p>opening text</p>', hash: 'v1', deleted: false };
        saves = 0;
        configure({ id: 'n1', path: PATH, name: 'en.dtmpl', mimeType: 'text/x-dtmpl', permissions: { write: true } },
            { input: () => Promise.resolve(copyName) }, () => discard);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    /** The server's answer to every pending read and save of the file. */
    function serve(): void {
        for (const req of httpMock.match(URL)) {
            answer(req);
        }
    }

    function answer(req: TestRequest): void {
        if (req.request.method === 'GET') {
            req.flush({ content: stored.content, contentHash: stored.hash });

            return;
        }
        saves++;
        const named = req.request.headers.get('If-Match');
        if (stored.deleted) {
            req.flush({ title: 'Not Found' }, { status: 404, statusText: 'Not Found' });

            return;
        }
        if (named !== null && named !== `"${stored.hash}"`) {
            req.flush({ title: 'Precondition Failed' }, { status: 412, statusText: 'Precondition Failed' });

            return;
        }
        stored = { content: req.request.body.content, hash: 'v' + (Number(stored.hash.slice(1)) + 1), deleted: false };
        req.flush({ contentHash: stored.hash });
    }

    function open() {
        const fixture = TestBed.createComponent(DtmplEditorDialogComponent);
        fixture.detectChanges();

        return fixture;
    }

    function edit(fixture: ReturnType<typeof open>, html: string): void {
        fixture.componentInstance.onContentChange(html);
        fixture.detectChanges();
    }

    function click(fixture: ReturnType<typeof open>, label: string): void {
        const button = (Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[])
            .find(b => (b.textContent ?? '').trim() === label);
        if (!button) throw new Error('no button "' + label + '"');
        button.click();
        fixture.detectChanges();
    }

    function notice(fixture: ReturnType<typeof open>): string {
        return (fixture.nativeElement.querySelector('.dtmpl-editor-dialog__notice')?.textContent ?? '').replace(/\s+/g, ' ').trim();
    }

    it('saves naming the version it read, and the next save names the version that save answered', () => {
        const editor = open();
        serve();
        editor.detectChanges();

        edit(editor, '<p>first</p>');
        click(editor, 'Save');
        const first = httpMock.expectOne(URL);
        expect(first.request.method).toBe('PUT');
        expect(first.request.headers.get('If-Match')).toBe('"v1"');
        answer(first);
        editor.detectChanges();

        edit(editor, '<p>second</p>');
        click(editor, 'Save');
        const second = httpMock.expectOne(URL);
        expect(second.request.headers.get('If-Match')).toBe('"v2"');
        answer(second);
        expect(stored.content).toBe('<p>second</p>');
    });

    it('two sessions on one file: the second save is refused, and nothing of either is lost', () => {
        const alice = open();
        const bob = open();
        serve();
        alice.detectChanges();
        bob.detectChanges();

        edit(bob, '<p>from Bob</p>');
        click(bob, 'Save');
        serve();

        edit(alice, '<p>from Alice</p>');
        click(alice, 'Save');
        serve();
        alice.detectChanges();

        // Bob's save stands: Alice's did not overwrite it.
        expect(stored.content).toBe('<p>from Bob</p>');
        expect(stored.hash).toBe('v2');
        // Alice is told, and her edits are still in her editor, unsaved.
        expect(notice(alice)).toContain('saved by someone else since you opened it');
        expect(alice.componentInstance.editorContent()).toBe('<p>from Alice</p>');
        expect(alice.componentInstance.dirty()).toBeTrue();
        // One save each: the refused one was not retried.
        expect(saves).toBe(2);
    });

    it('a file deleted since it was opened is not made again: 404, said, and no Reload offered', () => {
        const editor = open();
        serve();
        editor.detectChanges();
        stored.deleted = true;

        edit(editor, '<p>late edit</p>');
        click(editor, 'Save');
        serve();
        editor.detectChanges();

        expect(notice(editor)).toContain('deleted since you opened it');
        expect(notice(editor)).not.toContain('Reload');
        expect(editor.componentInstance.editorContent()).toBe('<p>late edit</p>');
    });

    it('Reload, confirmed, reads the file and its version again; declined, the edits stay', () => {
        const editor = open();
        serve();
        editor.detectChanges();
        stored = { content: '<p>someone else</p>', hash: 'v7', deleted: false };

        edit(editor, '<p>mine</p>');
        click(editor, 'Save');
        serve();
        editor.detectChanges();

        discard = false;
        click(editor, 'Reload');
        httpMock.expectNone(URL);
        expect(editor.componentInstance.editorContent()).toBe('<p>mine</p>');

        discard = true;
        click(editor, 'Reload');
        serve();
        editor.detectChanges();
        expect(editor.componentInstance.editorContent()).toBe('<p>someone else</p>');
        expect(notice(editor)).toBe('');

        // The reload's version is the one the next save names.
        edit(editor, '<p>after reload</p>');
        click(editor, 'Save');
        const save = httpMock.expectOne(URL);
        expect(save.request.headers.get('If-Match')).toBe('"v7"');
        answer(save);
    });

    it('Save as a copy writes next to the original with overwrite off, and the editor then edits the copy', async () => {
        const editor = open();
        serve();
        editor.detectChanges();
        stored.hash = 'v9';

        edit(editor, '<p>mine</p>');
        click(editor, 'Save');
        serve();
        editor.detectChanges();
        click(editor, 'Save as a copy');
        await Promise.resolve();
        await Promise.resolve();

        const copy = httpMock.expectOne(BINARY);
        const form = copy.request.body as FormData;
        expect(form.get('path')).toBe('/pages/about.html/en (copy).dtmpl');
        expect(form.get('overwrite')).toBe('0');
        expect(await (form.get('file') as Blob).text()).toBe('<p>mine</p>');
        copy.flush({ contentHash: 'c1' });
        editor.detectChanges();
        expect(notice(editor)).toBe('');
        expect(editor.nativeElement.querySelector('.dtmpl-editor-dialog__title').textContent).toContain('en (copy).dtmpl');

        // The original was not touched; the next save goes to the copy, naming its version.
        expect(stored.content).toBe('<p>opening text</p>');
        edit(editor, '<p>more</p>');
        click(editor, 'Save');
        const next = httpMock.expectOne('https://api.test/vfs/content?path=%2Fpages%2Fabout.html%2Fen%20(copy).dtmpl');
        expect(next.request.headers.get('If-Match')).toBe('"c1"');
        next.flush({ contentHash: 'c2' });
    });

    it('a read that names no version: nothing is saved over the file, the edits go to a copy', async () => {
        const editor = open();
        httpMock.expectOne(URL).flush({ content: stored.content });
        editor.detectChanges();
        expect(notice(editor)).toContain('could not be read');

        copyName = null;
        edit(editor, '<p>mine</p>');
        click(editor, 'Save');
        await Promise.resolve();
        httpMock.expectNone(URL);
        expect(editor.componentInstance.editorContent()).toBe('<p>mine</p>');
    });

    it('a read that failed leaves no editor to save from: no Save, only Reload, and nothing written', async () => {
        const editor = open();
        httpMock.expectOne(URL).flush({ title: 'Server Error' }, { status: 500, statusText: 'Server Error' });
        editor.detectChanges();
        expect(notice(editor)).toContain('could not be read, so it cannot be edited here');
        expect(notice(editor)).not.toContain('Save as a copy');
        expect(editor.nativeElement.querySelector('coolms-editor')).withContext('no editor over an unread file').toBeNull();

        // Even an edit that reached it leaves Save off, and a save asked for anyway writes nothing.
        let asked = 0;
        TestBed.inject(NativeDialogService).input = (() => { asked++; return Promise.resolve(null); }) as never;
        edit(editor, '<p>typed into an empty editor</p>');
        const save = (Array.from(editor.nativeElement.querySelectorAll('button')) as HTMLButtonElement[])
            .find(b => (b.textContent ?? '').trim() === 'Save');
        expect(save?.disabled).withContext('Save is off, edited or not').toBeTrue();
        editor.componentInstance.save();
        await Promise.resolve();
        httpMock.expectNone(URL);
        httpMock.expectNone(BINARY);
        expect(asked).withContext('no copy offered: there is nothing read to copy').toBe(0);
        expect(stored.content).toBe('<p>opening text</p>');

        // Reload reads it again, and a good read gives the editor back.
        click(editor, 'Reload');
        serve();
        editor.detectChanges();
        expect(notice(editor)).toBe('');
        expect(editor.nativeElement.querySelector('coolms-editor')).not.toBeNull();
    });
});

/**
 * A `.ddoc` that could not be read leaves no editor to save from.
 *
 * Its save sends the sections by position, so an empty editor saved over a document whose read failed would have
 * replaced its first section with whatever was typed into the blank. The read failing, the dialog shows no editor, Save
 * is off, and Reload is the way back.
 */
describe('DtmplEditorDialogComponent -- a .ddoc that could not be read', () => {
    const DDOC = '/api/v1/document/ddoc/content?path=%2Fdocs%2Freport.ddoc';
    let httpMock: HttpTestingController;

    beforeEach(() => {
        configure({ id: 'd1', path: '/docs/report.ddoc', name: 'report.ddoc', mimeType: DDOC_DOCUMENT_MIME, permissions: { write: true } },
            { input: () => Promise.resolve(null) }, () => true);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('no editor, no Save, and a save asked for anyway writes nothing', () => {
        const editor = TestBed.createComponent(DtmplEditorDialogComponent);
        editor.detectChanges();
        httpMock.expectOne(DDOC).flush({ title: 'Server Error' }, { status: 500, statusText: 'Server Error' });
        editor.detectChanges();

        const text = (editor.nativeElement.querySelector('.dtmpl-editor-dialog__notice')?.textContent ?? '').replace(/\s+/g, ' ');
        expect(text).toContain('could not be read, so it cannot be edited here');
        expect(editor.nativeElement.querySelector('coolms-editor')).withContext('no editor over an unread document').toBeNull();

        editor.componentInstance.onContentChange('<p>typed into an empty editor</p>');
        editor.componentInstance.save();
        httpMock.expectNone(DDOC);
    });
});

/**
 * A `.ddoc` saves only over the version it was read at.
 *
 * The read answers the version; every save sends it as If-Match; a newer version is refused (412) and a document gone
 * is not made again (404), and the editor says so. Save as a copy asks the server to compose the copy from the
 * original AT the version read plus the edits, so no edit made since is merged in. The fake keeps one document (one
 * section's body is enough here) and every version it has had, the way the server keeps a revision per content hash.
 */
describe('DtmplEditorDialogComponent -- a .ddoc saves over the version it read', () => {
    const DDOC = '/api/v1/document/ddoc/content?path=%2Fdocs%2Freport.ddoc';
    const COPY = '/api/v1/document/ddoc/copy?path=%2Fdocs%2Freport%20(copy).ddoc&from=%2Fdocs%2Freport.ddoc';
    let httpMock: HttpTestingController;
    let copyName: string | null;
    let stored: { html: string; hash: string; deleted: boolean };
    let revisions: Record<string, string>;
    let saves: number;

    beforeEach(() => {
        copyName = 'report (copy).ddoc';
        stored = { html: '<p>opening text</p>', hash: 'd1', deleted: false };
        revisions = { d1: '<p>opening text</p>' };
        saves = 0;
        configure({ id: 'd1', path: '/docs/report.ddoc', name: 'report.ddoc', mimeType: DDOC_DOCUMENT_MIME, permissions: { write: true } },
            { input: () => Promise.resolve(copyName) }, () => true);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    const read = (html: string, hash: string | null) => ({
        defaults: { fontName: 'Carlito', fontSizePoints: 11 },
        paper: { sizes: [], orientations: [], margins: [] },
        sections: [{ html }],
        footnotes: {},
        contentHash: hash,
    });

    function serve(): void {
        for (const req of httpMock.match(DDOC)) {
            if (req.request.method === 'GET') {
                req.flush(read(stored.html, stored.hash));
                continue;
            }
            saves++;
            if (stored.deleted) {
                req.flush({ title: 'Not Found' }, { status: 404, statusText: 'Not Found' });
                continue;
            }
            // A save naming another version is refused; one naming none is applied unchecked, as the server does.
            const named = req.request.headers.get('If-Match');
            if (named !== null && named !== `"${stored.hash}"`) {
                req.flush({ title: 'Precondition Failed' }, { status: 412, statusText: 'Precondition Failed' });
                continue;
            }
            const hash = 'd' + (Number(stored.hash.slice(1)) + 1);
            stored = { html: req.request.body.sections[0].html, hash, deleted: false };
            revisions[hash] = stored.html;
            req.flush({ contentHash: hash });
        }
    }

    function open() {
        const fixture = TestBed.createComponent(DtmplEditorDialogComponent);
        fixture.detectChanges();

        return fixture;
    }

    function edit(fixture: ReturnType<typeof open>, html: string): void {
        fixture.componentInstance.onContentChange(html);
        fixture.detectChanges();
    }

    function notice(fixture: ReturnType<typeof open>): string {
        return (fixture.nativeElement.querySelector('.dtmpl-editor-dialog__notice')?.textContent ?? '').replace(/\s+/g, ' ').trim();
    }

    it('saves naming the version it read, then the version that save answered', () => {
        const doc = open();
        serve();
        edit(doc, '<p>first</p>');
        doc.componentInstance.save();
        const first = httpMock.expectOne(DDOC);
        expect(first.request.method).toBe('PUT');
        expect(first.request.headers.get('If-Match')).toBe('"d1"');
        first.flush({ contentHash: 'd2' });

        edit(doc, '<p>second</p>');
        doc.componentInstance.save();
        const second = httpMock.expectOne(DDOC);
        expect(second.request.headers.get('If-Match')).toBe('"d2"');
        second.flush({ contentHash: 'd3' });
    });

    it('two sessions on one document: the second save is refused, and nothing of either is lost', () => {
        const alice = open();
        const bob = open();
        serve();

        edit(bob, '<p>from Bob</p>');
        bob.componentInstance.save();
        serve();

        edit(alice, '<p>from Alice</p>');
        alice.componentInstance.save();
        serve();
        alice.detectChanges();

        expect(stored.html).toBe('<p>from Bob</p>');
        expect(stored.hash).toBe('d2');
        expect(notice(alice)).toContain('saved by someone else since you opened it');
        expect(alice.componentInstance.editorContent()).toBe('<p>from Alice</p>');
        expect(alice.componentInstance.dirty()).toBeTrue();
        expect(saves).toBe(2);
    });

    it('Save as a copy is composed from the version read, never over a file, and the editor then edits the copy', async () => {
        const doc = open();
        serve();
        stored = { html: '<p>someone else</p>', hash: 'd5', deleted: false };
        revisions['d5'] = stored.html;

        edit(doc, '<p>mine</p>');
        doc.componentInstance.save();
        serve();
        doc.detectChanges();
        doc.componentInstance.saveAsCopy();
        await Promise.resolve();
        await Promise.resolve();

        const copy = httpMock.expectOne(COPY);
        expect(copy.request.method).toBe('POST');
        expect(copy.request.headers.get('If-Match')).withContext('the version the editor read, not the newest').toBe('"d1"');
        expect(copy.request.body.sections[0].html).toBe('<p>mine</p>');
        copy.flush({ path: '/docs/report (copy).ddoc', contentHash: 'c1' }, { status: 201, statusText: 'Created' });
        doc.detectChanges();
        expect(notice(doc)).toBe('');
        expect(stored.html).withContext('the original is untouched').toBe('<p>someone else</p>');

        edit(doc, '<p>more</p>');
        doc.componentInstance.save();
        const next = httpMock.expectOne('/api/v1/document/ddoc/content?path=%2Fdocs%2Freport%20(copy).ddoc');
        expect(next.request.headers.get('If-Match')).toBe('"c1"');
        next.flush({ contentHash: 'c2' });
    });

    it('a document deleted since it was opened: said, no copy offered, and nothing is made again', () => {
        const doc = open();
        serve();
        stored.deleted = true;

        edit(doc, '<p>late edit</p>');
        doc.componentInstance.save();
        serve();
        doc.detectChanges();

        expect(notice(doc)).toContain('deleted since you opened it');
        expect(notice(doc)).toContain('Download as .docx keeps your edits');
        expect(notice(doc)).not.toContain('Save as a copy');
        doc.componentInstance.save();
        httpMock.expectNone(DDOC);
        httpMock.expectNone(COPY);
        expect(doc.componentInstance.editorContent()).toBe('<p>late edit</p>');
    });

    it('a read that names no version: nothing is saved over the document, and no copy can be made of it', () => {
        const doc = open();
        httpMock.expectOne(DDOC).flush(read('<p>opening text</p>', null));
        doc.detectChanges();
        expect(notice(doc)).toContain('could not be read');

        edit(doc, '<p>mine</p>');
        doc.componentInstance.save();
        httpMock.expectNone(DDOC);
        httpMock.expectNone(COPY);
    });
});
