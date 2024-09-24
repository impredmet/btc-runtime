import { Address } from '../types/Address';
import { BigInt } from '../libraries/BigInt';

export class DeployContractResponse {
    readonly virtualAddress: BigInt;
    readonly contractAddress: Address;

    constructor(virtualAddress: BigInt, contractAddress: Address) {
        this.virtualAddress = virtualAddress;
        this.contractAddress = contractAddress;
    }
}
