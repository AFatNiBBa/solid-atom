
# solid-atom
Simple two way reactive bindings

## Usage
```tsx
import { createSignal } from "solid-js";
import { Atom } from "solid-atom";

function Counter(props: { atom?: Atom<number> }) {
    const atom = Atom.source(() => props.atom, () => createSignal(12));
    return <>
        <button onClick={() => atom.value++}>
            {atom.value}
        </button>
    </>
}

function App() {
    const atom = Atom.value(1);
    return <>
        <button onClick={() => atom.value--}>
            Decrease
        </button>

        {/* Controlled from the outside */}
        <Counter atom={atom} />

        {/* Starts at 12 */}
        <Counter />
    </>
}
```

## Documentation

### `Atom`
Object that wraps something that's both readable and writable
- `memo()`: Creates a new `Atom` with the setter of the current one and a memoized version of its getter
- `convert()`: Creates a new `Atom` that applies a conversion to the current one
- `update()`: Like the `Setter` overload of a `Signal` that takes a function with the previous value
- `defer()`: Creates a new `Atom` that defers the setter of the current one
- `selector()`: Two way version of `createSelector()`
- `readOnly()` (**static**): Creates a new `Atom` that throws an error when trying to set it
- `unwrap()` (**static**): Allows the use of an `Accessor` of an `Atom` without having to call the `Accessor` each time
- `from()` (**static**): Creates an `Atom` based on a `Signal`
- `prop()` (**static**): Creates an `Atom` based on an object property
- `value()` (**static**): Creates a new `Atom` that directly stores a value
- `source()` (**static**): Similiar to `Atom.unwrap()`, but if the `Accessor` doesn't return anything it automatically creates an internal `Atom` in which to store the value

### Utility
The module also exposes some of its internal utilities
- `NamesOf`: Utility type that powers `nameOf()`
- `nameOf()`: Utility function that powers `Atom.prop()`
- `NO_OP`: Function that does nothing
- `IDENTITY`: Function that returns passed value and can be used as a class

## Why
Two way bindings are annoying to do in **"solid-js"**, here are some things that I personally tried doing
- <b><span style="color: red;">✗</span> Making props writable</b>: Possible only with one attribute
- <b><span style="color: red;">✗</span> Passing the value and an event to change it</b>: Very annoying when forwarding props, since there are TWO properties to pass for EACH two way binding (And in my project I had a lot on each component)
- <b><span style="color: red;">✗</span> Passing a whole `Signal` tuple</b>: We're getting closer, but `Signal`s have NOT been made to be used directly
    - **Not unpackable**: If you unpack them they lose one layer of reactivity
        ```js
        const [ get, set ] = props.signal;                  // What if `props.signal` itself changes?
        get();                                              // This could be the `Accessor` of the OLD `Signal`
        ```
    - **Indexes**: Because of the previous problem, you MUST access the components of a `Signal` through its indexes, which is both ugly and doesn't make the intention clear
        ```js
        const value = props.signal[0]();                    // When reading
        props.signal[1](value);                             // When writing
        ```
    - **Wrapped value**: You have always to wrap the value inside of a lambda before passing it to the `Setter` if you are not sure that it's not a function
        ```js
        props.signal[1](() => value);                       // If value it's a function, it will get called if passed directly
        ```
        > Doing benchmarks, I noticed that it is faster to always wrap with a lambda rather than doing it only if the value is a function
    - **Ugly to customize**: Let's suppose you want to create a custom `Signal` to give it a custom behaviour. For example, let's make a function that converts a property into a `Signal`:
        ```ts
        function prop<T, K extends keyof T>(obj: T, k: K): Signal<T[K]> {
            return [
                () => obj[k],                               // Getter
                v => obj[k] = v                             // Setter (Wrong)
            ];
        }
        ```
        You may be tempted to try something like this, but you'll soon notice that NOT ONLY you have to deal with the `Setter` overload that takes a function when setting, but we also have to explicitly implement that thing ourselves (Since we want our output to behave like a `Signal`)
        ```js
        // ...
        v => obj[k] = typeof v === "function" ? v(obj[k]) : v;
        // ...
        ```
    - **Requires synchonization**: Binding a value requires creating your own `Signal` and synchronizing it with the one passed by the user (If present)
        ```ts
        const [ get, set ] = createSignal(defaultValue);
        createEffect(on(() => props.signal[0](), x => set(() => x)));
        createEffect(on(get, x => props.signal[1](() => x)));
        ```
        > This is considered bad practice because it breaks the traceability of the "reactivity graph"
- <b><span style="color: green;">✓</span> Creating a custom substitute for the `Signal`</b>: This is what the library provides
    - **Unpackable**: The getter and the setter work indipendently from their `Atom`
        ```js
        const { get, set } = Atom.unwrap(() => props.atom); // The `Atom` gets wrapped
        get();                                              // This wraps the getter of the original `Atom`
        ```
    - **Actual properties**: You can interact with the `Atom` through named properties
        ```js
        const atom = Atom.unwrap(() => props.atom);
        atom.value++;                                       // Actual property for both getting and setting the value
        const value = atom.get();                           // Named getter
        atom.set(value);                                    // Named setter
        atom.update(x => value + x);                        // The infamous setter overload that takes a function
        atom.update();                                      // Writes back the same value
        ```
    - **No wrapper**: You can pass whatever you want to both the property and the setter
        ```js
        props.atom.value = value;
        // Or
        props.atom.set(value);
        ```
    - **Easy to customize**: You just need to create a new `Atom` with your implementation
        ```ts
        function prop<T, K extends keyof T>(obj: T, k: K) {
            return new Atom<T[K]>(
                () => obj[k],                               // Getter
                v => obj[k] = v                             // Setter
            );
        }
        ```
        > There's already `Atom.prop()` for doing this
    - **Only forwarding**: Binding a value does NOT require synchronization
        ```ts
        const atom = Atom.source(() => props.atom);         // (Starts at `undefined` if there's no `Atom` from the user)
        // Or
        const atom = Atom.source(() => props.atom, () => createSignal(defaultValue));
        ```
        - If the user doesn't provide `props.atom`, a `Signal` will be created to store the actual value
        - If the user provides `props.atom`, both its getter and setter will symply be forwarded (No synchronization)
        > This will also give the end-user control over things like the comparison function of the `Signal` that ultimately stores the value