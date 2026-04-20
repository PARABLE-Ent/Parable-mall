import { describe, expect, it } from 'vitest';

import { requiresCsrf } from '@/lib/auth/csrf';

describe('requiresCsrf', () => {
  it('GET 은 CSRF 검증 생략', () => {
    expect(requiresCsrf('GET')).toBe(false);
    expect(requiresCsrf('get')).toBe(false);
  });

  it('HEAD / OPTIONS 도 생략', () => {
    expect(requiresCsrf('HEAD')).toBe(false);
    expect(requiresCsrf('OPTIONS')).toBe(false);
  });

  it('POST / PATCH / PUT / DELETE 는 검증 필요', () => {
    expect(requiresCsrf('POST')).toBe(true);
    expect(requiresCsrf('PATCH')).toBe(true);
    expect(requiresCsrf('PUT')).toBe(true);
    expect(requiresCsrf('DELETE')).toBe(true);
  });
});
