import { describe, it, expect } from 'vitest';
import { parseProblem } from './problem';

describe('parseProblem', () => {
  it('reads detail, code, status and per-field errors', () => {
    const result = parseProblem(
      {
        type: 'https://hermes.radio/problems/invalid',
        title: 'Validation failed',
        status: 422,
        code: 'invalid',
        detail: 'username is taken',
        errors: {
          username: ['reserved', 'too long'],
          password: ['at least 8 characters'],
          empty: [],
        },
      },
      'fallback',
    );

    expect(result).toEqual({
      message: 'username is taken',
      code: 'invalid',
      status: 422,
      fieldErrors: {
        username: ['reserved', 'too long'],
        password: ['at least 8 characters'],
      },
    });
  });

  it('falls back to title when detail is missing', () => {
    expect(parseProblem({ title: 'Conflict', code: 'conflict' }, 'fallback').message).toBe(
      'Conflict',
    );
  });

  it('accepts a plain message body', () => {
    expect(parseProblem({ message: 'nope' }, 'fallback')).toEqual({
      message: 'nope',
      fieldErrors: {},
      code: null,
      status: null,
    });
  });

  it('uses the fallback for unknown bodies', () => {
    expect(parseProblem('bad', 'fallback')).toEqual({
      message: 'fallback',
      fieldErrors: {},
      code: null,
      status: null,
    });
    expect(parseProblem(null, 'fallback').message).toBe('fallback');
  });
});
