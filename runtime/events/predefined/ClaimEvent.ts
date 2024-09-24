import { NetEvent } from '../NetEvent';
import { BytesWriter } from '../../buffer/BytesWriter';
import { safeU256 } from '../../libraries/u256';

@final
export class ClaimEvent extends NetEvent {
    constructor(amount: safeU256) {
        const data: BytesWriter = new BytesWriter(1, true);
        data.writeU256(amount);

        super('Claim', data);
    }
}
