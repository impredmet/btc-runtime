import { SafeMath } from '../types/SafeMath';
import { MemorySlotPointer } from '../memory/MemorySlotPointer';
import { Blockchain } from '../env';
import { BigInt } from '../libraries/BigInt';

@final
export class StoredU256 {
    constructor(
        public pointer: u16,
        public subPointer: MemorySlotPointer,
        private defaultValue: BigInt,
    ) {}

    private _value: BigInt = BigInt.ZERO;

    @inline
    public get value(): BigInt {
        this.ensureValue();

        return this._value;
    }

    @inline
    public set value(value: BigInt) {
        if (BigInt.eq(value, this._value)) {
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
    public add(value: BigInt): this {
        this.ensureValue();

        this._value = SafeMath.add(this._value, value);
        Blockchain.setStorageAt(this.pointer, this.subPointer, this._value);

        return this;
    }

    @inline
    @operator('-')
    public sub(value: BigInt): this {
        this.ensureValue();

        this._value = SafeMath.sub(this._value, value);
        Blockchain.setStorageAt(this.pointer, this.subPointer, this._value);

        return this;
    }

    @inline
    @operator('*')
    public mul(value: BigInt): this {
        this.ensureValue();

        this._value = SafeMath.mul(this._value, value);
        Blockchain.setStorageAt(this.pointer, this.subPointer, this._value);

        return this;
    }

    @inline
    @operator('==')
    public eq(value: BigInt): boolean {
        this.ensureValue();

        return this._value === value;
    }

    @inline
    @operator('!=')
    public ne(value: BigInt): boolean {
        this.ensureValue();

        return this._value !== value;
    }

    @inline
    @operator('<')
    public lt(value: BigInt): boolean {
        this.ensureValue();

        return this._value < value;
    }

    @inline
    @operator('>')
    public gt(value: BigInt): boolean {
        this.ensureValue();

        return this._value > value;
    }

    @inline
    @operator('<=')
    public le(value: BigInt): boolean {
        this.ensureValue();

        return this._value <= value;
    }

    @inline
    @operator('>=')
    public ge(value: BigInt): boolean {
        this.ensureValue();

        return this._value >= value;
    }

    @inline
    @operator('>>')
    public shr(value: i32): this {
        this.ensureValue();

        this._value = this._value.shr(value);
        Blockchain.setStorageAt(this.pointer, this.subPointer, this._value);

        return this;
    }

    @inline
    @operator('&')
    public and(value: BigInt): this {
        this.ensureValue();

        this._value = this._value.and(value);
        Blockchain.setStorageAt(this.pointer, this.subPointer, this._value);

        return this;
    }

    @inline
    @operator('|')
    public or(value: BigInt): this {
        this.ensureValue();

        this._value = this._value.or(value);
        Blockchain.setStorageAt(this.pointer, this.subPointer, this._value);

        return this;
    }

    @inline
    @operator('^')
    public xor(value: BigInt): this {
        this.ensureValue();

        this._value = this._value.xor(value);
        Blockchain.setStorageAt(this.pointer, this.subPointer, this._value);

        return this;
    }

    @inline
    @operator('**')
    public pow(value: BigInt): this {
        this.ensureValue();

        // code pow from scratch
        let result: BigInt = BigInt.ONE;

        while (value > BigInt.ZERO) {
            if (value.and(BigInt.ONE)) {
                result = SafeMath.mul(result, this._value);
            }

            this._value = SafeMath.mul(this._value, this._value);
            value = value.shr(1);
        }

        Blockchain.setStorageAt(this.pointer, this.subPointer, this._value);

        return this;
    }

    @inline
    @operator('%')
    public mod(value: BigInt): this {
        this.ensureValue();

        // code mod from scratch
        let result: BigInt = BigInt.ZERO;
        let base: BigInt = this._value;
        let exp: BigInt = value;

        while (exp > BigInt.ZERO) {
            if (exp.and(BigInt.ONE)) {
                result = SafeMath.add(result, base);
            }

            base = SafeMath.add(base, base);
            exp = exp.shr(1);
        }

        this._value = result;
        Blockchain.setStorageAt(this.pointer, this.subPointer, this._value);

        return this;
    }

    @inline
    @operator.postfix('++')
    public inc(): this {
        this.ensureValue();

        this._value = SafeMath.add(this._value, BigInt.ONE);
        Blockchain.setStorageAt(this.pointer, this.subPointer, this._value);

        return this;
    }

    @inline
    @operator.postfix('--')
    public dec(): this {
        this.ensureValue();

        this._value = SafeMath.sub(this._value, BigInt.ONE);
        Blockchain.setStorageAt(this.pointer, this.subPointer, this._value);

        return this;
    }

    @inline
    public set(value: BigInt): this {
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
