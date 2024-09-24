import { Address } from '../../types/Address';
import { NetEvent } from '../NetEvent';
import { BytesWriter } from '../../buffer/BytesWriter';
import { safeU256 } from '../../libraries/u256';

@final
export class ApproveEvent extends NetEvent {
    constructor(owner: Address, spender: Address, value: safeU256) {
        const data: BytesWriter = new BytesWriter(1, true);
        data.writeAddress(owner);
        data.writeAddress(spender);
        data.writeU256(value);

        super('Approve', data);
    }
}
