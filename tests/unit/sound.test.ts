import { describe, expect, it } from 'vitest';
import { setSoundEnabled, sound } from '../../src/lib/sound';

describe('sound', () => {
  it('is a silent no-op where Web Audio is missing, and when turned off', () => {
    expect(() => sound('saved')).not.toThrow();
    setSoundEnabled(false);
    expect(() => sound('mood', 5)).not.toThrow();
    setSoundEnabled(true);
  });
});
