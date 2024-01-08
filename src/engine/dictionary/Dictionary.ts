// Super dumb way of making a js object as a somewhat typed thing
export class Dictionary<T> {
	[key: string]: T;

	constructor() {
		const newproto = Object.create(null);
		newproto[Symbol.iterator] = function* () {
			for (const key in this) {
				yield this[key]; // yield [key, value] pair
			}
		};
		this.__proto__ = newproto;
	}

	public *[Symbol.iterator](): IterableIterator<T> {
		for (const key in this) {
			yield this[key];
		}
	}
}
