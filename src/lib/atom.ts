
import { Accessor, MemoOptions, Setter, Signal, SignalOptions, createMemo, createSelector, createSignal, equalFn, on, untrack } from "solid-js";
import { NamesOf, nameOf } from "./nameOf";
import { IDENTITY, NO_OP } from "./util";

/** Function that throws an error stating the current {@link Atom} can't be set */
const THROW = () => { throw new ReferenceError(`No setter was defined for the current ${JSON.stringify(Atom.name)}`); };

/** Reactive atomic value without the inconveniences of {@link Signal} */
export class Atom<T> {
	get value() { return this.get(); }

	set value(v: T) { this.set(v); }

	constructor(public get: Accessor<T>, public set: (x: T) => void) { }

	/**
	 * Creates a new {@link Atom} with the setter of the current one and a memoized version of its getter
	 * @param opts The memo's settings
	 */
	memo(opts?: MemoOptions<T>) { return new Atom(createMemo(this.get, undefined, opts), this.set); }

	/**
     * Creates a new {@link Atom} that applies a conversion to the current one
     * @param to Conversion function from {@link S} to {@link D}
     * @param from Conversion function from {@link D} to {@link S}
     */
	convert<R>(to: (x: T) => R, from: (x: R) => T) { return new Atom(() => to(this.value), v => this.value = from(v)); }

	/**
     * Allows you to execute {@link set} on the current {@link Atom} based on its current value.
     * The current value gets read through {@link untrack} to mimic the {@link Setter} behaviour.
	 * If {@link f} is not provided, it will set the current value again
     * @param f Function that creates a new value based on the current one
	 * @returns Whatever {@link f} returned
     */
	update<V extends T>(f: (prev: T) => V = IDENTITY): V {
		const out = f(untrack(this.get));
		return this.set(out), out;
	}

	/**
	 * Creates a new {@link Atom} that defers the setter of the current one.
	 * When the setter is called, it will schedule the value to be set using {@link schedule}.
	 * If the setter gets called again, the previous operation will be cancelled, unless it has already finished
	 * @param schedule 
	 */
	defer(schedule: (f: () => void) => () => void) {
		var clear = NO_OP;
		return new Atom(this.get, async v => {
			clear();
			await new Promise<void>(t => clear = schedule(t));
			clear = NO_OP; // I make sure that the next time the setter gets called, it won't cancel the previous operation, since I have no guarantee that the user provided clear function already handles this edge case
			this.value = v;
		});
	}

	/**
	 * Two way version of {@link createSelector}
	 * @param comp The comparer function
	 * @returns A boolean {@link Atom} factory
	 */
	selector(comp = equalFn<T>) {
		const isSelected = createSelector(this.get, comp);

		/**
 		 * Creates a boolean {@link Atom} for the specified value
		 * @param value The reactive {@link Accessor} to the value for which the resulting {@link Atom} will be `true`
		 * @param def The value to set to the parent {@link Atom} when the resulting one is set to `false`
		 */
		return (f: Accessor<T>, def: T | (T extends undefined ? void : never)) => {
			return new Atom(() => isSelected(f()), v => {
				const value = f();
				if (v) return this.value = value;
				if (!comp(value, this.value)) return;
				this.value = <T>def;
			});
		};
	}

	/**
	 * Creates a new {@link Atom} that throws an error when trying to set it
	 * @param f The getter for the new {@link Atom}
	 */
	static readOnly<T>(f: Accessor<T>) { return new this(f, THROW); }

    /**
     * Creates an {@link Atom} that forwards an {@link Accessor} to another {@link Atom}
     * @param f The reactive {@link Accessor} to the {@link Atom} to forward
     */
	static unwrap<T>(f: Accessor<Atom<T>>) { return new this(() => f().value, v => f().value = v); }

    /**
     * Creates an {@link Atom} based on a {@link Signal}
     * @param param0 The {@link Signal} to forward
     */
	static from<T>([ get, set ]: Signal<T>) { return new this(get, v => set(() => v)); }

	/**
	 * Creates an {@link Atom} based on an object property
	 * @param obj The object containing the property
	 * @param k A function that returns the key of the property and will be passed to {@link nameOf}
	 */
	static prop<T, K extends keyof T>(obj: Accessor<T>, k: (x: NamesOf<T>) => K) {
		const temp = () => nameOf<T, K>(k);
		return new this(() => obj()[temp()], v => obj()[temp()] = v);
	}

	/**
	 * Creates a new {@link Atom} that directly stores a value.
	 * Creates a new {@link Signal} and passes it to {@link from}
	 * @param v The value to store in the new {@link Signal}
	 * @param opts The {@link Signal}'s settings
	 */
	static value<T>(v?: undefined, opts?: SignalOptions<T>): Atom<T | undefined>;
	static value<T>(v: T, opts?: SignalOptions<T>): Atom<T>;
	static value<T>(v: T, opts?: SignalOptions<T>) {
		return this.from(createSignal(v, opts));
	}

	/**
     * Creates a bindable data source.
     * If {@link bind} returns an {@link Atom} it gets wrapped, otherwise it creates a {@link Signal} using {@link f} and uses it to store the value until {@link bind}'s value changes
     * @param bind The bound {@link Atom}
     * @param f The function that will create the actual {@link Signal} that will store the {@link Atom}'s data in case that {@link bind} doesn't return anything
     */
	static source<T>(bind: Accessor<Atom<T> | undefined>): Atom<T | undefined>;
	static source<T>(bind: Accessor<Atom<T> | undefined>, f: Accessor<Signal<T>>): Atom<T>;
	static source<T>(bind: Accessor<Atom<T> | undefined>, f: Accessor<Signal<T | undefined>> = createSignal<T>) {
		return this.unwrap(createMemo(on(bind, x => x as Atom<T | undefined> ?? this.from(f()))));
	}
}