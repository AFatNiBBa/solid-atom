
/** Proxy that handles the core of {@link nameOf} */
const PROXY: NamesOf<unknown> = new Proxy({}, { get: (_, k) => k });

/** Type that maps each key of {@link T} to itself */
export type NamesOf<T> = { readonly [k in keyof T]-?: k };

/**
 * Function that returns the name of the field accessed inside of {@link f}.
 * This function is not meant to be used on its own because it has very poor type inference
 * @param f A function that returns a value based on {@link NamesOf}
 * @returns The same thing that {@link f} returned
 */
export const nameOf = <T, const R>(f: (x: NamesOf<T>) => R) => f(PROXY as NamesOf<T>);