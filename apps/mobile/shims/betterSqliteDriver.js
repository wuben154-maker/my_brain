/** Stub: Node-only driver must not ship in the React Native bundle. */
export class BetterSqliteDriver {
  constructor() {
    throw new Error("BetterSqliteDriver is unavailable in React Native builds");
  }
}
