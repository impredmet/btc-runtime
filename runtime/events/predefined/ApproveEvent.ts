import { Address } from '../../types/Address';
import { NetEvent } from '../NetEvent';
import { BytesWriter } from '../../buffer/BytesWriter';
import { BigInt } from '../../libraries/BigInt';

@final
export class ApproveEvent extends NetEvent {
    constructor(owner: Address, spender: Address, value: BigInt) {
        const data: BytesWriter = new BytesWriter(1, true);
        data.writeAddress(owner);
        data.writeAddress(spender);
        data.writeU256(value);

        super('Approve', data);
    }
}
