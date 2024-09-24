import { Address } from '../types/Address';
import { safeU256 } from '../libraries/u256';

export class DeployContractResponse {
    readonly virtualAddress: safeU256;
    readonly contractAddress: Address;

    constructor(virtualAddress: safeU256, contractAddress: Address) {
        this.virtualAddress = virtualAddress;
        this.contractAddress = contractAddress;
    }
}
