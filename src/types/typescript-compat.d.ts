export {};

declare global {
  interface ObjectConstructor {
    entries<T>(o: Record<string, T>): Array<[string, T]>;
  }

  interface MapConstructor {
    new <T extends object>(entries: Array<Array<string | T>>): Map<string, T>;
  }
}
