import { Blockchain } from '../env';
import { safeU256 } from '../libraries/u256';

@final
export class StoredBoolean {
    constructor(
        public pointer: u16,
        private defaultValue: bool,
    ) {}

    private _value: safeU256 = safeU256.Zero;

    @inline
    public get value(): bool {
        this.ensureValue();

        return this._value.toBool();
    }

    @inline
    public set value(value: bool) {
        this._value = value ? safeU256.One : safeU256.Zero;

        Blockchain.setStorageAt(this.pointer, safeU256.Zero, this._value);
    }

    @inline
    public set(value: safeU256): this {
        this._value = value;

        Blockchain.setStorageAt(this.pointer, safeU256.Zero, this._value);

        return this;
    }

    @inline
    public toUint8Array(): Uint8Array {
        return this._value.toUint8Array(true);
    }

    private ensureValue(): void {
        this._value = Blockchain.getStorageAt(
            this.pointer,
            safeU256.Zero,
            this.defaultValue ? safeU256.One : safeU256.Zero,
        );
    }
}
