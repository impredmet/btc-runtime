import { DeployableOP_20 } from './DeployableOP_20';
import { OP20InitParameters } from './interfaces/OP20InitParameters';
import { safeU256 } from '../libraries/u256';

export abstract class OP_20 extends DeployableOP_20 {
    protected constructor(maxSupply: safeU256, decimals: u8, name: string, symbol: string) {
        super(new OP20InitParameters(maxSupply, decimals, name, symbol));
    }
}
