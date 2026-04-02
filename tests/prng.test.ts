import { describe, it, expect } from 'vitest';
import { PRNG } from '../client/src/utils/PRNG';

describe('PRNG', () => {
  it('produces deterministic sequence from seed', () => {
    const a = new PRNG(42);
    const b = new PRNG(42);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences from different seeds', () => {
    const a = new PRNG(42);
    const b = new PRNG(99);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it('next() returns values in [0, 1)', () => {
    const rng = new PRNG(123);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('range() returns values in [min, max)', () => {
    const rng = new PRNG(7);
    for (let i = 0; i < 100; i++) {
      const v = rng.range(5, 10);
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThan(10);
    }
  });

  it('int() returns integers in [min, max]', () => {
    const rng = new PRNG(7);
    for (let i = 0; i < 100; i++) {
      const v = rng.int(1, 6);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('pick() selects from array deterministically', () => {
    const items = ['a', 'b', 'c', 'd'];
    const a = new PRNG(42);
    const b = new PRNG(42);
    expect(a.pick(items)).toBe(b.pick(items));
  });

  it('shuffle() is deterministic', () => {
    const a = new PRNG(42);
    const b = new PRNG(42);
    expect(a.shuffle([1, 2, 3, 4, 5])).toEqual(b.shuffle([1, 2, 3, 4, 5]));
  });

  it('fork() creates independent child PRNG from label', () => {
    const parent1 = new PRNG(42);
    const parent2 = new PRNG(42);
    const child1 = parent1.fork('terrain');
    const child2 = parent2.fork('terrain');
    expect(child1.next()).toBe(child2.next());
    // Different label = different sequence
    const child3 = new PRNG(42).fork('creatures');
    expect(child1.next()).not.toBe(child3.next());
  });
});
