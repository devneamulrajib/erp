// Native replacement for the web "blob -> <a download>" pattern.
// Downloads an authenticated file to the app cache, then opens the system
// share / "open with" sheet so the user can view or save the PDF.
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getItem } from '../storage/tokenStore';

export async function downloadAndShare(url, filename, { tokenKey = 'portalToken', mimeType = 'application/pdf' } = {}) {
  const token = getItem(tokenKey);
  const safeName = String(filename || 'file.pdf').replace(/[^\w.\-]+/g, '_');
  const dest = new File(Paths.cache, safeName);
  const file = await File.downloadFileAsync(url, dest, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    idempotent: true,
  });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: safeName, UTI: mimeType === 'application/pdf' ? 'com.adobe.pdf' : undefined });
  }
  return file.uri;
}
