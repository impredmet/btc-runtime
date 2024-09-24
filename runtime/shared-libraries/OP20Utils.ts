import { Address } from '../types/Address';
import { BytesWriter } from '../buffer/BytesWriter';
import { Blockchain } from '../env';
import { encodeSelector, Selector } from '../math/abi';
import { BigInt } from '../libraries/BigInt';

export class OP20Utils {
    public static get BALANCE_OF_SELECTOR(): Selector {
        return encodeSelector('balanceOf');
    }

    public static balanceOf(token: Address, owner: Address): BigInt {
        const calldata: BytesWriter = new BytesWriter();
        calldata.writeSelector(OP20Utils.BALANCE_OF_SELECTOR);
        calldata.writeAddress(owner);

        const response = Blockchain.call(token, calldata);

        return response.readU256();
    }
}
