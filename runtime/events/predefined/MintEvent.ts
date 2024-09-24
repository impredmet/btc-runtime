import { NetEvent } from '../NetEvent';
import { BytesWriter } from '../../buffer/BytesWriter';
import { Address } from '../../types/Address';
import { BigInt } from '../../libraries/BigInt';

@final
export class MintEvent extends NetEvent {
    constructor(address: Address, amount: BigInt) {
        const data: BytesWriter = new BytesWriter(1, true);
        data.writeAddress(address);
        data.writeU256(amount);

        super('Mint', data);
    }
}
