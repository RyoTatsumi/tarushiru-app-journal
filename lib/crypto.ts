/**
 * ブラウザのWeb Crypto APIを使ったパスワードハッシュ化
 * SHA-256 + salt でハッシュ化する
 */

export async function hashPassword(password: string, salt?: string): Promise<string> {
  const useSalt = salt || crypto.randomUUID();
  const encoder = new TextEncoder();
  const data = encoder.encode(useSalt + password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `${useSalt}:${hashHex}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  // 旧形式（平文）の場合はそのまま比較
  if (!stored.includes(':') || stored.length < 40) {
    return password === stored;
  }

  const [salt] = stored.split(':');
  const rehashed = await hashPassword(password, salt);
  return rehashed === stored;
}
