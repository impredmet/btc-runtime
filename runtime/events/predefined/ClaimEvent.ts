import { NetEvent } from '../NetEvent';
import { BytesWriter } from '../../buffer/BytesWriter';
import { BigInt } from '../../libraries/BigInt';

@final
export class ClaimEvent extends NetEvent {
    constructor(amount: BigInt) {
        const data: BytesWriter = new BytesWriter(1, true);
        data.writeU256(amount);

        super('Claim', data);
    }
}
