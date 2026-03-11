/**
 * Download utilities for PDF and ZIP file downloads.
 */

type DownloadStatus = 'loading' | 'success' | 'error';

/**
 * Downloads a file from a fetch function, triggering a browser download.
 * Handles object URL creation/revocation and progress callbacks.
 */
export async function downloadFile(
  fetchFn: () => Promise<Blob>,
  filename: string,
  onProgress?: (status: DownloadStatus) => void
): Promise<void> {
  try {
    onProgress?.('loading');
    const blob = await fetchFn();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Delay revocation slightly so the browser can start the download
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    onProgress?.('success');
  } catch {
    onProgress?.('error');
    throw new Error(`Failed to download ${filename}`);
  }
}

/**
 * Sanitize a string for use in a filename (remove special chars).
 */
function sanitize(str: string): string {
  return str.replace(/[^A-Za-z0-9_-]/g, '_').replace(/_+/g, '_');
}

/**
 * Generates a terminal report PDF filename.
 * Format: [index]_[lastName]_Report_Term[N]_[year].pdf
 */
export function getReportFilename(
  studentIndex: string,
  studentName: string,
  termNumber: number,
  academicYear: string
): string {
  const parts = studentName.trim().split(/\s+/);
  const lastName = parts[parts.length - 1] || 'Student';
  const year = sanitize(academicYear);
  return `${studentIndex}_${sanitize(lastName)}_Report_Term${termNumber}_${year}.pdf`;
}

/**
 * Generates a transcript PDF filename.
 * Format: Transcript_[index]_[name].pdf
 */
export function getTranscriptFilename(
  studentIndex: string,
  studentName: string
): string {
  return `Transcript_${studentIndex}_${sanitize(studentName)}.pdf`;
}

/**
 * Generates a class report ZIP filename.
 * Format: ClassReports_[className]_Term[N]_[year].zip
 */
export function getClassReportZipFilename(
  className: string,
  termNumber: number,
  academicYear: string
): string {
  return `ClassReports_${sanitize(className)}_Term${termNumber}_${sanitize(academicYear)}.zip`;
}
