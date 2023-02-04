export { LruCache };

class LruCache {
	private _size: number;
	private _map = new Map<string, Record<string, unknown>>();

	constructor(size: number) {
		if (size <= 0 || size - Math.floor(size) != 0) {
			throw new Error('size must be a positive integer');
		}

		this._size = size;
	}

	get(id: string) {
		if (!this._map.has(id)) {
			return null;
		}

		// Make sure that value being asked for is the most recently used value.
		const value = this._map.get(id) as Record<string, unknown>;
		this._map.delete(id);
		this._map.set(id, value);

		return value;
	}

	set(id: string, value: Record<string, unknown>) {
		// Even though value is going to be overridden it needs to be the most recently added value.
		// Deleting first so that the size check always makes sense.
		if (this._map.has(id)) {
			this._map.delete(id);
		}

		// Evict oldest value when appropriate.
		if (this._map.size === this._size) {
			const [[id]] = this._map.entries();
			this._map.delete(id);
		}

		this._map.set(id, value);
	}

	delete(id: string) {
		this._map.delete(id);
	}

	clear() {
		this._map.clear();
	}
}
