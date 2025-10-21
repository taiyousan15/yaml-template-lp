// Manus OAuth認証ヘルパー
// 実際の実装では、Manus OAuth SDKを使用

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
}

export async function getSession(req: Request): Promise<User | null> {
  // TODO: 実装 - Manus OAuthトークンから取得
  // 現在はモック実装
  const authHeader = req.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  // TODO: トークン検証
  return {
    id: 'user_123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
  };
}

export function requireAuth(user: User | null): User {
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

export function requireAdmin(user: User | null): User {
  const authedUser = requireAuth(user);
  if (authedUser.role !== 'admin') {
    throw new Error('Forbidden: Admin access required');
  }
  return authedUser;
}
