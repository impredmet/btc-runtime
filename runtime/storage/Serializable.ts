import { Blockchain } from '../env';
import { MemorySlotPointer } from '../memory/MemorySlotPointer';
import { BytesWriter } from '../buffer/BytesWriter';
import { BytesReader } from '../buffer/BytesReader';
import { Revert } from '../types/Revert';
import { BigInt } from '../libraries/BigInt';

export abstract class Serializable {
    protected pointer: u16;
    protected subPointer: MemorySlotPointer;

    protected constructor(pointer: u16, subPointer: MemorySlotPointer) {
        this.pointer = pointer;
        this.subPointer = subPointer;
    }

    public abstract get chunkCount(): i32;

    public abstract writeToBuffer(): BytesWriter;

    public abstract readFromBuffer(reader: BytesReader): void;

    public load(): void {
        const chunks: BigInt[] = [];

        for (let index: i32 = 0; index < this.chunkCount; index++) {
            const chunk: BigInt = Blockchain.getStorageAt(
                this.pointer,
                BigInt.add(this.subPointer, BigInt.fromU32(index)),
                BigInt.ZERO,
            );
            chunks.push(chunk);
        }

        const reader = this.chunksToBytes(chunks);

        this.readFromBuffer(reader);
    }

    public save(): void {
        const writer: BytesWriter = this.writeToBuffer();

        const buffer = writer.getBuffer();

        const chunks: BigInt[] = this.bytesToChunks(buffer);

        for (let index: i32 = 0; index < chunks.length; index++) {
            Blockchain.setStorageAt(
                this.pointer,
                BigInt.add(this.subPointer, BigInt.from(index)),
                chunks[index],
            );
        }
    }

    protected bytesToChunks(buffer: Uint8Array): BigInt[] {
        const chunks: BigInt[] = [];

        for (let index: i32 = 0; index < buffer.byteLength; index += 32) {
            const chunk = buffer.slice(index, index + 32);
            chunks.push(BigInt.fromBytes(chunk, true));
        }

        return chunks;
    }

    protected chunksToBytes(chunks: BigInt[]): BytesReader {
        if (this.chunkCount >= 67108863) {
            throw new Revert('Too many chunks received');
        }

        const buffer: Uint8Array = new Uint8Array(this.chunkCount * 32);
        let offset: i32 = 0;

        for (let indexChunk: i32 = 0; indexChunk < chunks.length; indexChunk++) {
            const bytes: u8[] = chunks[indexChunk].toBytes(true);
            for (let indexByte: i32 = 0; indexByte < bytes.length; indexByte++) {
                buffer[offset++] = bytes[indexByte];
            }
        }

        return new BytesReader(buffer);
    }
}
