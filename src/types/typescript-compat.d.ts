export {};

declare global {
  interface ObjectConstructor {
    entries(o: Record<string, number>): Array<[string, number]>;
    entries<T>(o: Record<string, T>): Array<[string, T]>;
  }

  interface SacProductMapValue {
    id: string;
    tenantId: string;
    codeSku: string;
    name: string;
  }

  interface MapConstructor {
    new (entries: Array<Array<string | SacProductMapValue>>): Map<string, SacProductMapValue>;
  }
}
