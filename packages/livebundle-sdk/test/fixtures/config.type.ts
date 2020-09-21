export interface Config extends Record<string, unknown> {
  foo: Foo;
}

export interface Foo {
  a: number;
  b: string;
  c: Array<string>;
}
