let idCounter = 0;

export function generateId() {
  idCounter++;
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 9);
  const perf = typeof performance !== 'undefined' ? Math.floor(performance.now() * 1000) : 0;
  
  try {
    if (typeof window !== 'undefined' && window.crypto) {
      if (window.crypto.randomUUID) {
        return `${window.crypto.randomUUID()}-${idCounter}`;
      }
      if (window.crypto.getRandomValues) {
        const buffer = new Uint8Array(16);
        window.crypto.getRandomValues(buffer);
        buffer[6] = (buffer[6] & 0x0f) | 0x40;
        buffer[8] = (buffer[8] & 0x3f) | 0x80;
        const hex = Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join('');
        return `uuid-${hex.slice(0, 8)}-${hex.slice(8, 13)}-${idCounter}-${randomStr}`;
      }
    }
  } catch (e) {
    console.warn("Secure random ID generation failed, using fallback", e);
  }
  
  return `id-${timestamp}-${perf}-${idCounter}-${randomStr}`;
}
