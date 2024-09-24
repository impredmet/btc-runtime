import { SafeMath } from '../types/SafeMath';
import { MemorySlotPointer } from '../memory/MemorySlotPointer';
import { Blockchain } from '../env';
import { safeU256 } from '../libraries/u256';

@final
export class StoredU256 {
    constructor(
        public pointer: u16,
        public subPointer: MemorySlotPointer,
        private defaultValue: safeU256,
    ) {}

    private _value: safeU256 = safeU256.Zero;

    @inline
    public get value(): safeU256 {
        this.ensureValue();

        return this._value;
    }

    @inline
    public set value(value: safeU256) {
        if (safeU256.eq(value, this._value)) {
            return;
        }

        this._value = value;

        Blockchain.setStorageAt(this.pointer, this.subPointer, this._value);
    }

    @inline
    public get toBytes(): Uint8Array {
        return this._value.toUint8Array(false);
    }

    @inline
    @operator('+')
    public add(value: safeU256): this {
        this.ensureValue();

        this._value = SafeMath.add(this._value, value);
        Blockchain.setStorageAt(this.pointer, this.subPointer, this._value);

        return this;
    }

    @inline
    @operator('-')
    public sub(value: safeU256): this {
        this.ensureValue();

        this._value = SafeMath.sub(this._value, value);
        Blockchain.setStorageAt(this.pointer, this.subPointer, this._value);

        return this;
    }

    @inline
    @operator('*')
    public mul(value: safeU256): this {
        this.ensureValue();

        this._value = SafeMath.mul(this._value, value);
        Blockchain.setStorageAt(this.pointer, this.subPointer, this._value);

        return this;
    }

    @inline
    @operator('==')
    public eq(value: safeU256): boolean {
        this.ensureValue();

        return this._value === value;
    }

    @inline
    @operator('!=')
    public ne(value: safeU256): boolean {
        this.ensureValue();

        return this._value !== value;
    }

    @inline
    @operator('<')
    public lt(value: safeU256): boolean {
        this.ensureValue();

        return this._value < value;
    }

    @inline
    @operator('>')
    public gt(value: safeU256): boolean {
        this.ensureValue();

        return this._value > value;
    }

    @inline
    @operator('<=')
    public le(value: safeU256): boolean {
        this.ensureValue();

        return this._value <= value;
    }

    @inline
    @operator('>=')
    public ge(value: safeU256): boolean {
        this.ensureValue();

        return this._value >= value;
    }

    @inline
    @operator('>>')
    public shr(value: i32): this {
        this.ensureValue();

        this._value.shr(value);
        Blockchain.setStorageAt(this.pointer, this.subPointer, this._value);

        return this;
    }

    @inline
    @operator('&')
    public and(value: safeU256): this {
        this.ensureValue();

        this._value.and(value);
        Blockchain.setStorageAt(this.pointer, this.subPointer, this._value);

        return this;
    }

    @inline
    @operator('|')
    public or(value: safeU256): this {
        this.ensureValue();

        this._value.or(value);
        Blockchain.setStorageAt(this.pointer, this.subPointer, this._value);

        return this;
    }

    @inline
    @operator('^')
    public xor(value: safeU256): this {
        this.ensureValue();

        this._value.xor(value);
        Blockchain.setStorageAt(this.pointer, this.subPointer, this._value);

        return this;
    }

    @inline
    @operator('**')
    public pow(value: safeU256): this {
        this.ensureValue();

        // code pow from scratch
        let result: safeU256 = safeU256.One;

        while (value > safeU256.Zero) {
            if (safeU256.and(value, safeU256.One)) {
                result = SafeMath.mul(result, this._value);
            }

            this._value.mul(this._value.clone());
            value.shr(1);
        }

        Blockchain.setStorageAt(this.pointer, this.subPointer, this._value);

        return this;
    }

    @inline
    @operator('%')
    public mod(value: safeU256): this {
        this.ensureValue();

        // code mod from scratch
        const result: safeU256 = safeU256.Zero;
        const base: safeU256 = this._value;

        const exp: safeU256 = value;

        while (exp > safeU256.Zero) {
            if (safeU256.and(exp, safeU256.One)) {
                result.add(base);
            }

            base.add(base.clone().mul(base.clone()));
            exp.shr(1);
        }

        this._value = result;
        Blockchain.setStorageAt(this.pointer, this.subPointer, this._value);

        return this;
    }

    @inline
    @operator.postfix('++')
    public inc(): this {
        this.ensureValue();

        this._value = SafeMath.add(this._value, safeU256.One);
        Blockchain.setStorageAt(this.pointer, this.subPointer, this._value);

        return this;
    }

    @inline
    @operator.postfix('--')
    public dec(): this {
        this.ensureValue();

        this._value = SafeMath.sub(this._value, safeU256.One);
        Blockchain.setStorageAt(this.pointer, this.subPointer, this._value);

        return this;
    }

    @inline
    public set(value: safeU256): this {
        this._value = value;

        Blockchain.setStorageAt(this.pointer, this.subPointer, this._value);

        return this;
    }

    @inline
    public toUint8Array(): Uint8Array {
        return this._value.toUint8Array(true);
    }

    private ensureValue(): void {
        this._value = Blockchain.getStorageAt(this.pointer, this.subPointer, this.defaultValue);
    }
}
