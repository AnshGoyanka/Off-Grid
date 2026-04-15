import {VectorClock, VectorClockMap} from '../services/ledger/VectorClock';

describe('VectorClock', () => {
  // ─── Construction ──────────────────────────────────────────────

  it('initializes with own node at 0', () => {
    const vc = new VectorClock('A');
    expect(vc.getOwnTime()).toBe(0);
    expect(vc.getTime('A')).toBe(0);
  });

  it('accepts an initial clock map', () => {
    const vc = new VectorClock('A', {A: 3, B: 5});
    expect(vc.getOwnTime()).toBe(3);
    expect(vc.getTime('B')).toBe(5);
  });

  it('returns 0 for unknown nodes', () => {
    const vc = new VectorClock('A');
    expect(vc.getTime('Z')).toBe(0);
  });

  // ─── Increment ─────────────────────────────────────────────────

  it('increments own counter each call', () => {
    const vc = new VectorClock('A');
    vc.increment();
    expect(vc.getOwnTime()).toBe(1);
    vc.increment();
    expect(vc.getOwnTime()).toBe(2);
    vc.increment();
    expect(vc.getOwnTime()).toBe(3);
  });

  it('increment returns the updated clock map', () => {
    const vc = new VectorClock('node1');
    const map = vc.increment();
    expect(map['node1']).toBe(1);
  });

  // ─── Merge ─────────────────────────────────────────────────────

  it('merge takes element-wise max', () => {
    const vc = new VectorClock('A');
    vc.increment(); // A:1
    vc.merge({A: 0, B: 5});
    expect(vc.getTime('A')).toBe(1); // kept own greater value
    expect(vc.getTime('B')).toBe(5); // took remote value
  });

  it('merge adds new nodes from remote', () => {
    const vc = new VectorClock('A');
    vc.merge({B: 3, C: 7});
    expect(vc.getTime('B')).toBe(3);
    expect(vc.getTime('C')).toBe(7);
  });

  it('merge with higher remote value updates local', () => {
    const vc = new VectorClock('A', {A: 2, B: 1});
    vc.merge({A: 5, B: 0});
    expect(vc.getTime('A')).toBe(5); // remote was higher
    expect(vc.getTime('B')).toBe(1); // local was higher, kept
  });

  // ─── happenedBefore ────────────────────────────────────────────

  it('happenedBefore: A < B when all counters of A ≤ B and at least one strictly less', () => {
    const a: VectorClockMap = {X: 1, Y: 0};
    const b: VectorClockMap = {X: 2, Y: 0};
    expect(VectorClock.happenedBefore(a, b)).toBe(true);
    expect(VectorClock.happenedBefore(b, a)).toBe(false);
  });

  it('happenedBefore: false for equal clocks', () => {
    const a: VectorClockMap = {X: 1};
    const b: VectorClockMap = {X: 1};
    expect(VectorClock.happenedBefore(a, b)).toBe(false);
  });

  it('happenedBefore: treats missing keys as 0', () => {
    const a: VectorClockMap = {A: 1};
    const b: VectorClockMap = {A: 1, B: 2};
    // a.B = 0 < b.B = 2, and a.A = b.A = 1 → A happened before B
    expect(VectorClock.happenedBefore(a, b)).toBe(true);
  });

  it('happenedBefore: false when B has a smaller counter than A', () => {
    const a: VectorClockMap = {A: 3, B: 1};
    const b: VectorClockMap = {A: 2, B: 5};
    // a.A=3 > b.A=2 → NOT happened-before
    expect(VectorClock.happenedBefore(a, b)).toBe(false);
  });

  // ─── areConcurrent ─────────────────────────────────────────────

  it('areConcurrent: detects concurrent (conflicting) events', () => {
    // A sent to B without B knowing about A's latest
    const a: VectorClockMap = {A: 2, B: 0};
    const b: VectorClockMap = {A: 0, B: 2};
    expect(VectorClock.areConcurrent(a, b)).toBe(true);
    expect(VectorClock.areConcurrent(b, a)).toBe(true);
  });

  it('areConcurrent: false for causal ordering', () => {
    const a: VectorClockMap = {A: 1};
    const b: VectorClockMap = {A: 2};
    expect(VectorClock.areConcurrent(a, b)).toBe(false);
  });

  it('areConcurrent: false for equal clocks', () => {
    const a: VectorClockMap = {A: 1};
    const b: VectorClockMap = {A: 1};
    expect(VectorClock.areConcurrent(a, b)).toBe(false);
  });

  // ─── areEqual ──────────────────────────────────────────────────

  it('areEqual: true for identical clocks', () => {
    const a: VectorClockMap = {A: 1, B: 2};
    const b: VectorClockMap = {A: 1, B: 2};
    expect(VectorClock.areEqual(a, b)).toBe(true);
  });

  it('areEqual: treats missing keys as 0', () => {
    const a: VectorClockMap = {A: 1};
    const b: VectorClockMap = {A: 1, B: 0};
    expect(VectorClock.areEqual(a, b)).toBe(true);
  });

  it('areEqual: false when values differ', () => {
    const a: VectorClockMap = {A: 1};
    const b: VectorClockMap = {A: 2};
    expect(VectorClock.areEqual(a, b)).toBe(false);
  });

  // ─── toJSON / fromJSON ─────────────────────────────────────────

  it('toJSON returns a deep copy (mutations do not affect original)', () => {
    const vc = new VectorClock('A');
    vc.increment();
    const json = vc.toJSON();
    expect(json.A).toBe(1);
    json.A = 999;
    expect(vc.getOwnTime()).toBe(1); // original unchanged
  });

  it('fromJSON restores clock state', () => {
    const vc = VectorClock.fromJSON('A', {A: 5, B: 3});
    expect(vc.getOwnTime()).toBe(5);
    expect(vc.getTime('B')).toBe(3);
  });

  it('fromJSON can be incremented normally after restore', () => {
    const vc = VectorClock.fromJSON('A', {A: 5});
    vc.increment();
    expect(vc.getOwnTime()).toBe(6);
  });

  // ─── Integration: send → receive flow ──────────────────────────

  it('models a simple two-node send/receive flow', () => {
    const nodeA = new VectorClock('A');
    const nodeB = new VectorClock('B');

    // A sends event 1
    const clockAtSend = nodeA.increment(); // A:{A:1}

    // B receives and merges
    nodeB.merge(clockAtSend);
    nodeB.increment(); // B:{A:1, B:1}

    // A's clock happens-before B's (B has seen more)
    expect(VectorClock.happenedBefore(clockAtSend, nodeB.toJSON())).toBe(true);
  });

  it('detects double-spend attempt via concurrent clocks', () => {
    // Alice and Bob both think they can spend — neither knows about the other's claim
    const alice = new VectorClock('Alice');
    const bob = new VectorClock('Bob');

    const aliceClock = alice.increment(); // Alice claims spend
    const bobClock = bob.increment();     // Bob claims spend independently

    // These are concurrent — classic double-spend scenario
    expect(VectorClock.areConcurrent(aliceClock, bobClock)).toBe(true);
  });
});
