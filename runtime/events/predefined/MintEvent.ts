import { NetEvent } from '../NetEvent';
import { BytesWriter } from '../../buffer/BytesWriter';
import { Address } from '../../types/Address';
import { safeU256 } from '../../libraries/u256';

@final
export class MintEvent extends NetEvent {
    constructor(address: Address, amount: safeU256) {
        const data: BytesWriter = new BytesWriter(1, true);
        data.writeAddress(address);
        data.writeU256(amount);

        super('Mint', data);
    }
}
