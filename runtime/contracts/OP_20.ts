import { DeployableOP_20 } from './DeployableOP_20';
import { OP20InitParameters } from './interfaces/OP20InitParameters';
import { BigInt } from '../libraries/BigInt';

export abstract class OP_20 extends DeployableOP_20 {
    protected constructor(maxSupply: BigInt, decimals: u8, name: string, symbol: string) {
        super(new OP20InitParameters(maxSupply, decimals, name, symbol));
    }
}
