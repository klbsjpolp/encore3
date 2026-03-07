import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn util', () => {
  it('should merge classes correctly', () => {
    expect(cn('flex', 'items-center')).toBe('flex items-center');
  });

  it('should handle conditional classes', () => {
    expect(cn('flex', true && 'items-center', false && 'hidden')).toBe('flex items-center');
  });

  it('should merge tailwind classes correctly', () => {
    // twMerge should handle conflicts
    expect(cn('px-2 py-2', 'p-4')).toBe('p-4');
  });
});
