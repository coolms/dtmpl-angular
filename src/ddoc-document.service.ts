import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { DdocFootnoteEdits, DdocPayload, DdocSectionEdit } from '@coolms/ddoc';
import type { Observable } from 'rxjs';

/*
 * The `.ddoc` payload types, the four mapping functions and the section-break markup are @coolms/ddoc's
 * (2026-10-07): one copy for every client of the format, tested where it is published. Re-exported here, so an
 * import from @coolms/dtmpl-angular keeps working.
 */
export {
    DDOC_CUSTOM_SIZE,
    DDOC_DOCUMENT_MIME,
    joinDdocSections,
    referencedFootnoteIds,
    sectionsDisagreeOnPaper,
    splitDdocSections,
} from '@coolms/ddoc';
export type {
    DdocFootnoteEdits,
    DdocMarginPreset,
    DdocMargins,
    DdocPage,
    DdocPaperCatalog,
    DdocPaperSize,
    DdocPayload,
    DdocSection,
    DdocSectionEdit,
} from '@coolms/ddoc';

/** A `.ddoc` as read: the document, and the version it was read at (null when the file has none). */
export type DdocRead = DdocPayload & { readonly contentHash?: string | null };

/**
 * The `.ddoc` editing endpoints.
 *
 * ## Why a `.ddoc` does not use the VFS content endpoint
 *
 * A `.dtmpl` needs no service of its own: its stored form IS a fragment of
 * HTML, so `GET /vfs/files/content` hands the editor exactly what it edits. A
 * `.ddoc` is the document MODEL, and the projection between the two -- the
 * mapper chain, the style ids, twips -- lives in PHP. Fetching the JSON here
 * would mean writing that chain a second time in TypeScript and then keeping
 * two implementations agreeing about `w:ilvl`.
 *
 *  **The save sends every section, and only the bodies.** The page setup,
 * the headers, the footers and the footnote bodies are left out on purpose:
 * the server merges what arrives over the STORED document, so anything the
 * editor does not mention keeps whatever the file said. Sending a partial copy
 * of them would be the one way to lose them.
 */
@Injectable({ providedIn: 'root' })
export class DdocDocumentService {
    private readonly http = inject(HttpClient);

    /** The document and the version it is at, from one read: the version every save of it names. */
    read(path: string): Observable<DdocRead> {
        return this.http.get<DdocRead>(this.url('content', path));
    }

    /**
     * The edits merged over the stored document, only if it is still at `version` (If-Match): a newer version is
     * refused (412), a document gone is not made again (404).
     */
    write(
        path: string,
        version: string,
        sections: readonly DdocSectionEdit[],
        footnotes?: DdocFootnoteEdits,
    ): Observable<{ contentHash?: string | null }> {
        return this.http.put<{ contentHash?: string | null }>(
            this.url('content', path),
            this.payload(sections, footnotes),
            { headers: this.ifMatch(version) },
        );
    }

    /**
     * The edits saved as a NEW document at `path`, composed by the server from `from` AS IT WAS AT `version` -- so no
     * edit made since is merged in. Never over a file: a name taken answers 409; the original gone, 404; that version
     * no longer kept, 410.
     */
    copy(
        path: string,
        from: string,
        version: string,
        sections: readonly DdocSectionEdit[],
        footnotes?: DdocFootnoteEdits,
    ): Observable<{ path?: string; contentHash?: string | null }> {
        return this.http.post<{ path?: string; contentHash?: string | null }>(
            `${this.url('copy', path)}&from=${encodeURIComponent(from)}`,
            this.payload(sections, footnotes),
            { headers: this.ifMatch(version) },
        );
    }

    /**
     * The document as a PDF, rendered from what is on screen.
     *
     * Nothing is saved: the server merges in memory. What an author previews is
     * what a save-then-download would produce, because it is the same merge.
     */
    render(
        path: string,
        sections: readonly DdocSectionEdit[],
        footnotes?: DdocFootnoteEdits,
    ): Observable<Blob> {
        return this.http.post(
            this.url('preview', path),
            this.payload(sections, footnotes),
            { responseType: 'blob' },
        );
    }

    download(
        path: string,
        sections: readonly DdocSectionEdit[],
        format: 'docx' | 'pdf',
        footnotes?: DdocFootnoteEdits,
    ): Observable<Blob> {
        return this.http.post(
            `${this.url('download', path)}&format=${format}`,
            this.payload(sections, footnotes),
            { responseType: 'blob' },
        );
    }

    /**
     *  `footnotes` is OMITTED when there is nothing to say, never sent as an
     * empty object. `{}` is a payload that mentions the notes and changes none
     * -- the same outcome today, but only by accident of the merge rules, while
     * the rule the seam states is that an ABSENT key is unchanged. Saying
     * nothing is the shape that cannot be misread later.
     */
    private payload(
        sections: readonly DdocSectionEdit[],
        footnotes?: DdocFootnoteEdits,
    ): Record<string, unknown> {
        return undefined === footnotes || 0 === Object.keys(footnotes).length
            ? { sections }
            : { sections, footnotes };
    }

    private ifMatch(version: string): HttpHeaders {
        return new HttpHeaders({ 'If-Match': `"${version}"` });
    }

    private url(action: string, path: string): string {
        return `/api/v1/document/ddoc/${action}?path=${encodeURIComponent(path)}`;
    }
}
