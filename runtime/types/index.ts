import { Map } from '../generic/Map';
import { MemorySlotPointer } from '../memory/MemorySlotPointer';
import { MemorySlotData } from '../memory/MemorySlot';
import { Address } from './Address';
import { safeU256 } from '../libraries/u256';

export type PointerStorage = Map<MemorySlotPointer, MemorySlotData<safeU256>>;
export type BlockchainStorage = Map<Address, PointerStorage>;
