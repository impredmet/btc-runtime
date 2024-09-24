import { Revert } from '../types/Revert';
import { Map } from './Map';
import { BigInt } from '../libraries/BigInt';

export class MapU256 extends Map<BigInt, BigInt> {
    public set(key: BigInt, value: BigInt): void {
        const index: i32 = this._keys.indexOf(key);
        if (index == -1) {
            this._keys.push(key);
            this._values.push(value);
        } else {
            this._values[index] = value;
        }
    }

    public indexOf(pointerHash: BigInt): i32 {
        for (let i: i32 = 0; i < this._keys.length; i++) {
            const key = this._keys[i];

            if (BigInt.eq(key, pointerHash)) {
                return i;
            }
        }

        return -1;
    }

    public has(key: BigInt): bool {
        for (let i: i32 = 0; i < this._keys.length; i++) {
            if (BigInt.eq(this._keys[i], key)) {
                return true;
            }
        }

        return false;
    }

    public get(key: BigInt): BigInt {
        const index: i32 = this.indexOf(key);
        if (index == -1) {
            throw new Revert('Key not found in map');
        }
        return this._values[index];
    }

    public delete(key: BigInt): bool {
        const index: i32 = this.indexOf(key);
        if (index == -1) {
            return false;
        }

        this._keys.splice(index, 1);
        this._values.splice(index, 1);

        return true;
    }
}
