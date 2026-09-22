import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FileEditorRegistry, type VfsNodeDto } from '@coolms/ui-angular';
import { DDOC_DOCUMENT_MIME } from './ddoc-document.service';
import { DtmplEditorDialogComponent } from './dtmpl-editor-dialog.component';
import { provideDtmplEditors } from './provide-dtmpl-editors';

/**
 * The registration, RUN. This is the whole seam between a host and this
 * package: the dialog reaches a user only if the file-editor registry answers
 * for the two mimes, and until this file existed the registration lived in the
 * admin's `app.config.ts` where no spec could see it either.
 *
 * `FileEditorRegistry` is static, so the registry survives the TestBed; the
 * assertions read what the initializer put there.
 */
describe('provideDtmplEditors', () => {
    beforeEach(async () => {
        TestBed.configureTestingModule({ providers: [provideDtmplEditors()] });
        // Initializers run when the application injector is created.
        await TestBed.inject(ApplicationInitStatus).donePromise;
    });

    /** A file node as the file manager hands one to the registry. */
    const file = (mimeType: string): VfsNodeDto => ({ mimeType, type: 'file', name: 'x', path: '/x' } as VfsNodeDto);

    it('answers for a dtmpl body and for the native document, with the same dialog', () => {
        expect(FileEditorRegistry.resolve(file('text/x-dtmpl'))?.component).toBe(DtmplEditorDialogComponent);
        expect(FileEditorRegistry.resolve(file(DDOC_DOCUMENT_MIME))?.component).toBe(DtmplEditorDialogComponent);
    });

    it('registers the native document EXACTLY, because its wildcard resolves to nothing', () => {
        // `application/*` is what the registry would fall back to, and nothing
        // registers it -- so an exact entry is the only way a .ddoc opens here
        // instead of in the code editor, which is where it landed before.
        expect(FileEditorRegistry.hasEditorForMime('application/*')).toBeFalse();
        expect(FileEditorRegistry.hasEditorForMime(DDOC_DOCUMENT_MIME)).toBeTrue();
    });
});
