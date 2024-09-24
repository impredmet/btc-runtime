import { safeU256 } from '../../libraries/u256';

export class OP20InitParameters {
    readonly maxSupply: safeU256;
    readonly decimals: u8;
    readonly name: string;
    readonly symbol: string;

    constructor(maxSupply: safeU256, decimals: u8, name: string, symbol: string) {
        this.maxSupply = maxSupply;
        this.decimals = decimals;
        this.name = name;
        this.symbol = symbol;
    }
}
