const REVOKE_DELAY_MS = 1000;

/** Trigger a browser download of the given data. */
export function downloadBlob(data: BlobPart, fileName: string, type: string): void {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.style.display = 'none';
  // Some browsers only start the download for an anchor that is in the document, and the URL must stay valid
  // until the browser has read the data - so it is revoked after a short delay, not straight away.
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}
