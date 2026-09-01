// VowOS intentionally targets ES2020 for the broadest supported browser set.
// String.prototype.replaceAll was standardized in ES2021, so keep both the
// compiler surface and runtime behavior available without raising the global
// TypeScript lib target (which would silently permit other ES2021-only APIs).

export {};

declare global {
  interface String {
    replaceAll(searchValue: string | RegExp, replaceValue: string): string;
    replaceAll(searchValue: string | RegExp, replacer: (substring: string, ...args: unknown[]) => string): string;
  }
}

if (typeof String.prototype.replaceAll !== 'function') {
  Object.defineProperty(String.prototype, 'replaceAll', {
    configurable: true,
    writable: true,
    value: function replaceAll(
      this: string,
      searchValue: string | RegExp,
      replaceValue: string | ((substring: string, ...args: unknown[]) => string),
    ): string {
      const source = String(this);

      if (searchValue instanceof RegExp) {
        if (!searchValue.global) {
          throw new TypeError('String.prototype.replaceAll called with a non-global RegExp argument');
        }
        return source.replace(searchValue, replaceValue as never);
      }

      const escaped = String(searchValue).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return source.replace(new RegExp(escaped, 'g'), replaceValue as never);
    },
  });
}
