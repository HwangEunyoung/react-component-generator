import { describe, it, expect } from 'vitest';
import { MAX_PROMPT_LENGTH, validatePrompt } from './validatePrompt';

describe('validatePrompt', () => {
  it('500자 이하이면 유효하다', () => {
    const result = validatePrompt('a'.repeat(500));
    expect(result).toEqual({ isValid: true, error: null });
  });

  it('500자를 초과하면 유효하지 않다', () => {
    const result = validatePrompt('a'.repeat(501));
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('500');
  });

  it('빈 문자열은 길이 제한 관점에서 유효하다', () => {
    const result = validatePrompt('');
    expect(result).toEqual({ isValid: true, error: null });
  });

  it('MAX_PROMPT_LENGTH는 500이다', () => {
    expect(MAX_PROMPT_LENGTH).toBe(500);
  });
});
