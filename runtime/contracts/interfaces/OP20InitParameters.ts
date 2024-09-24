import { BigInt } from '../../libraries/BigInt';

export class OP20InitParameters {
    readonly maxSupply: BigInt;
    readonly decimals: u8;
    readonly name: string;
    readonly symbol: string;

    constructor(maxSupply: BigInt, decimals: u8, name: string, symbol: string) {
        this.maxSupply = maxSupply;
        this.decimals = decimals;
        this.name = name;
        this.symbol = symbol;
    }
}
