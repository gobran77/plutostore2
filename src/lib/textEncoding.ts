const MOJIBAKE_PATTERN = /[\u00C2\u00C3\u00D8\u00D9\u00DA\u00DB\u00E2\u00F0]/;

export const fixTextEncoding = (value?: string | null): string => {
  if (typeof value !== 'string') return '';
  if (!value || !MOJIBAKE_PATTERN.test(value)) return value;

  try {
    const bytes = Uint8Array.from(Array.from(value).map((ch) => ch.charCodeAt(0) & 0xff));
    const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    return decoded && decoded.trim().length > 0 ? decoded : value;
  } catch {
    return value;
  }
};
