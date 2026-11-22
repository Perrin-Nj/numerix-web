// @types/node 20 has no node:sqlite (Node 22.5+ ships it); the render-audit helper uses only this much.
declare module 'node:sqlite' {
  export class DatabaseSync {
    constructor(path: string, options?: { readOnly?: boolean });
    prepare(sql: string): { all(...args: unknown[]): unknown[]; get(...args: unknown[]): unknown };
  }
}
