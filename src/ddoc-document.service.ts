import { HttpClient } from '@angular/common/http';
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

    read(path: string): Observable<DdocPayload> {
        return this.http.get<DdocPayload>(this.url('content', path));
    }

    write(
        path: string,
        sections: readonly DdocSectionEdit[],
        footnotes?: DdocFootnoteEdits,
    ): Observable<{ contentHash: string }> {
        return this.http.put<{ contentHash: string }>(
            this.url('content', path),
            this.payload(sections, footnotes),
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

    private url(action: string, path: string): string {
        return `/api/v1/document/ddoc/${action}?path=${encodeURIComponent(path)}`;
    }
}
