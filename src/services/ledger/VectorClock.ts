// VectorClock — Lamport-style logical clock for causal ordering in offline mesh
// Used to prevent double-spend and establish transaction ordering without a central server
//
// Each node maintains a counter for every node it knows about.
// On each local event (send), the node increments its own counter.
// On receiving a message, the node merges the incoming clock (max of each entry).
// Comparing two clocks determines "happened-before" (causal ordering).

export type VectorClockMap = Record<string, number>;

export class VectorClock {
  private clock: VectorClockMap;
  private nodeId: string;

  constructor(nodeId: string, initial?: VectorClockMap) {
    this.nodeId = nodeId;
    this.clock = initial ? {...initial} : {[nodeId]: 0};
  }

  /**
   * Increment this node's counter (call before every local event / send)
   */
  increment(): VectorClockMap {
    this.clock[this.nodeId] = (this.clock[this.nodeId] || 0) + 1;
    return this.toJSON();
  }

  /**
   * Merge an incoming clock from a peer (call on every receive)
   * Takes the element-wise max of both clocks
   */
  merge(remote: VectorClockMap): void {
    for (const [nodeId, remoteTime] of Object.entries(remote)) {
      const localTime = this.clock[nodeId] || 0;
      this.clock[nodeId] = Math.max(localTime, remoteTime);
    }
    // Ensure our own entry is at least as high as the merged result
    if (!this.clock[this.nodeId]) {
      this.clock[this.nodeId] = 0;
    }
  }

  /**
   * Check if clock A "happened before" clock B (A < B)
   * A < B iff: ∀ nodeId: A[nodeId] ≤ B[nodeId] AND ∃ nodeId: A[nodeId] < B[nodeId]
   */
  static happenedBefore(a: VectorClockMap, b: VectorClockMap): boolean {
    const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
    let allLessOrEqual = true;
    let atLeastOneStrictlyLess = false;

    for (const key of allKeys) {
      const aV = a[key] || 0;
      const bV = b[key] || 0;

      if (aV > bV) {
        allLessOrEqual = false;
        break;
      }
      if (aV < bV) {
        atLeastOneStrictlyLess = true;
      }
    }

    return allLessOrEqual && atLeastOneStrictlyLess;
  }

  /**
   * Check if two clocks are concurrent (neither happened before the other)
   * This indicates a potential conflict that needs resolution
   */
  static areConcurrent(a: VectorClockMap, b: VectorClockMap): boolean {
    return (
      !VectorClock.happenedBefore(a, b) &&
      !VectorClock.happenedBefore(b, a) &&
      !VectorClock.areEqual(a, b)
    );
  }

  /**
   * Check if two clocks are identical
   */
  static areEqual(a: VectorClockMap, b: VectorClockMap): boolean {
    const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of allKeys) {
      if ((a[key] || 0) !== (b[key] || 0)) return false;
    }
    return true;
  }

  /**
   * Get this node's current counter value
   */
  getOwnTime(): number {
    return this.clock[this.nodeId] || 0;
  }

  /**
   * Get the counter for a specific node
   */
  getTime(nodeId: string): number {
    return this.clock[nodeId] || 0;
  }

  /**
   * Get the full clock state as a plain object
   */
  toJSON(): VectorClockMap {
    return {...this.clock};
  }

  /**
   * Create a VectorClock instance from a serialized map
   */
  static fromJSON(nodeId: string, data: VectorClockMap): VectorClock {
    return new VectorClock(nodeId, data);
  }

  /**
   * Serialize to string for BLE payload
   */
  serialize(): string {
    return JSON.stringify(this.clock);
  }

  /**
   * Deserialize from BLE payload string
   */
  static deserialize(nodeId: string, data: string): VectorClock {
    const parsed = JSON.parse(data) as VectorClockMap;
    return new VectorClock(nodeId, parsed);
  }
}

export default VectorClock;
