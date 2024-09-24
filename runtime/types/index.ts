import { Map } from '../generic/Map';
import { MemorySlotPointer } from '../memory/MemorySlotPointer';
import { MemorySlotData } from '../memory/MemorySlot';
import { Address } from './Address';
import { BigInt } from '../libraries/BigInt';

export type PointerStorage = Map<MemorySlotPointer, MemorySlotData<BigInt>>;
export type BlockchainStorage = Map<Address, PointerStorage>;
