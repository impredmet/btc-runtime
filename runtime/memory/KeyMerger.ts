import { MemorySlotData } from './MemorySlot';
import { Blockchain } from '../env';
import { MemorySlotPointer } from './MemorySlotPointer';
import { encodePointer } from '../math/abi';
import { safeU256 } from '../libraries/u256';

@final
export class KeyMerger<K extends string, K2 extends string, V extends MemorySlotData<safeU256>> {
    public parentKey: K;

    public pointer: u16;

    constructor(
        parent: K,
        pointer: u16,
        private readonly defaultValue: V,
    ) {
        this.pointer = pointer;

        this.parentKey = parent;
    }

    public set(key2: K2, value: V): this {
        const mergedKey: string = `${this.parentKey}${key2}`;
        const keyHash: MemorySlotPointer = encodePointer(mergedKey);

        Blockchain.setStorageAt(this.pointer, keyHash, value);

        return this;
    }

    public get(key: K): MemorySlotData<safeU256> {
        const mergedKey: string = `${this.parentKey}${key}`;

        return Blockchain.getStorageAt(this.pointer, encodePointer(mergedKey), this.defaultValue);
    }

    public has(key: K): bool {
        const mergedKey: string = `${this.parentKey}${key}`;

        return Blockchain.hasStorageAt(this.pointer, encodePointer(mergedKey));
    }

    @unsafe
    public delete(_key: K): bool {
        throw new Error('Method not implemented.');
    }

    @unsafe
    public clear(): void {
        throw new Error('Clear method not implemented.');
    }
}
