import { Revert } from '../types/Revert';
import { Map } from './Map';
import { safeU256 } from '../libraries/u256';

export class MapU256 extends Map<safeU256, safeU256> {
    public set(key: safeU256, value: safeU256): void {
        const index: i32 = this._keys.indexOf(key);
        if (index == -1) {
            this._keys.push(key);
            this._values.push(value);
        } else {
            this._values[index] = value;
        }
    }

    public indexOf(pointerHash: safeU256): i32 {
        for (let i: i32 = 0; i < this._keys.length; i++) {
            const key = this._keys[i];

            if (safeU256.eq(key, pointerHash)) {
                return i;
            }
        }

        return -1;
    }

    public has(key: safeU256): bool {
        for (let i: i32 = 0; i < this._keys.length; i++) {
            if (safeU256.eq(this._keys[i], key)) {
                return true;
            }
        }

        return false;
    }

    public get(key: safeU256): safeU256 {
        const index: i32 = this.indexOf(key);
        if (index == -1) {
            throw new Revert('Key not found in map');
        }
        return this._values[index];
    }

    public delete(key: safeU256): bool {
        const index: i32 = this.indexOf(key);
        if (index == -1) {
            return false;
        }

        this._keys.splice(index, 1);
        this._values.splice(index, 1);

        return true;
    }
}
