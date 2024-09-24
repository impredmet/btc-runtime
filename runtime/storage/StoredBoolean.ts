import { Blockchain } from '../env';
import { BigInt } from '../libraries/BigInt';

@final
export class StoredBoolean {
    constructor(
        public pointer: u16,
        private defaultValue: bool,
    ) {}

    private _value: BigInt = BigInt.ZERO;

    @inline
    public get value(): bool {
        this.ensureValue();

        return this._value.toBool();
    }

    @inline
    public set value(value: bool) {
        this._value = value ? BigInt.ONE : BigInt.ZERO;

        Blockchain.setStorageAt(this.pointer, BigInt.ZERO, this._value);
    }

    @inline
    public set(value: BigInt): this {
        this._value = value;

        Blockchain.setStorageAt(this.pointer, BigInt.ZERO, this._value);

        return this;
    }

    @inline
    public toUint8Array(): Uint8Array {
        return this._value.toUint8Array(true);
    }

    private ensureValue(): void {
        this._value = Blockchain.getStorageAt(
            this.pointer,
            BigInt.ZERO,
            this.defaultValue ? BigInt.ONE : BigInt.ZERO,
        );
    }
}
