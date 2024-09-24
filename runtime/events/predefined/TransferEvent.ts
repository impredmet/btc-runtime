import { NetEvent } from '../NetEvent';
import { Address } from '../../types/Address';
import { BytesWriter } from '../../buffer/BytesWriter';
import { safeU256 } from '../../libraries/u256';

@final
export class TransferEvent extends NetEvent {
    constructor(from: Address, to: Address, amount: safeU256) {
        const data: BytesWriter = new BytesWriter(1, true);
        data.writeAddress(from);
        data.writeAddress(to);
        data.writeU256(amount);

        super('Transfer', data);
    }
}
