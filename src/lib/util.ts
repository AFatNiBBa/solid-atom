
/** Function that does nothing */
export const NO_OP = () => { };

/** Function that returns passed value and can be used as a class */
export const IDENTITY: Identity = function(x: any) { return x; } as any;

/** Type definition of {@link IDENTITY} */
interface Identity {

    /**
     * Returns the passed value
     * -
     * Maintains the type of the input
     * @param x The value to be returned
     */
    <T>(x: T): T;

    /**
     * Returns the passed value
     * -
     * Allows the function to be used to fake any conversion.
     * Example:
     * ```ts
     * const a = IDENTITY(12);
     * //    ^? 12
     * 
     * const b: (x: string) => number = IDENTITY;
     * // No error
     * ```
     * It is important for this overload to be defined after the previous one
     * @param x The value to be returned
     */
    (x: any): any;

    /**
     * Returns the passed value
     * -
     * Allows you to extend a specific instance rather than a class.
     * Private field example:
     * ```ts
     * class Something extends IDENTITY {
     *     #value = 12;
     * 
     *     static get(obj: object) { return (obj as Something).#value; }
     * 
     *     static set(obj: object, v: number) { (obj as Something).#value = v; }
     * }
     * 
     * const a = {};
     * const b = new Something(a);
     * const c = a === b;               // true
     * const d = Something.get(a);      // 12
     * ```
     * Custom function example:
     * ```ts
     * class CoolFunction<T> extends IDENTITY<() => T> {
     *     constructor(public f: () => T) { super(f); }
     * }
     * 
     * const a = () => 12;
     * const b = new CoolFunction(a);
     * const c = a === b && b === b.f;  // true
     * const d = b();                   // 12
     * const e = b.f();                 // 12
     * ```
     * @param x The value to be returned
     */
    new<T = object>(x: T): T;
}