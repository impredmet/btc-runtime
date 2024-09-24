import { NetEvent } from '../NetEvent';
import { BytesWriter } from '../../buffer/BytesWriter';
import { BigInt } from '../../libraries/BigInt';

@final
export class BurnEvent extends NetEvent {
    constructor(amount: BigInt) {
        const data: BytesWriter = new BytesWriter(1, true);
        data.writeU256(amount);

        super('Burn', data);
    }
}
