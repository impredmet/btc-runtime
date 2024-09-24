import { BytesWriter } from '../buffer/BytesWriter';
import { Blockchain } from '../env';
import { ApproveEvent, BurnEvent, MintEvent, TransferEvent } from '../events/predefined';
import { encodeSelector, Selector } from '../math/abi';
import { AddressMemoryMap } from '../memory/AddressMemoryMap';
import { MemorySlotData } from '../memory/MemorySlot';
import { MultiAddressMemoryMap } from '../memory/MultiAddressMemoryMap';
import { StoredString } from '../storage/StoredString';
import { StoredU256 } from '../storage/StoredU256';
import { Address } from '../types/Address';
import { Revert } from '../types/Revert';
import { SafeMath } from '../types/SafeMath';
import { Calldata } from '../universal/ABIRegistry';
import { IOP_20 } from './interfaces/IOP_20';
import { OP20InitParameters } from './interfaces/OP20InitParameters';
import { OP_NET } from './OP_NET';
import { BigInt } from '../libraries/BigInt';

const maxSupplyPointer: u16 = Blockchain.nextPointer;
const decimalsPointer: u16 = Blockchain.nextPointer;
const namePointer: u16 = Blockchain.nextPointer;
const symbolPointer: u16 = Blockchain.nextPointer;
const totalSupplyPointer: u16 = Blockchain.nextPointer;
const allowanceMapPointer: u16 = Blockchain.nextPointer;
const balanceOfMapPointer: u16 = Blockchain.nextPointer;

export abstract class DeployableOP_20 extends OP_NET implements IOP_20 {
    protected readonly allowanceMap: MultiAddressMemoryMap<
        Address,
        Address,
        MemorySlotData<BigInt>
    >;
    protected readonly balanceOfMap: AddressMemoryMap<Address, MemorySlotData<BigInt>>;

    protected readonly _maxSupply: StoredU256;
    protected readonly _decimals: StoredU256;
    protected readonly _name: StoredString;
    protected readonly _symbol: StoredString;

    protected constructor(params: OP20InitParameters | null = null) {
        super();

        this.allowanceMap = new MultiAddressMemoryMap<Address, Address, MemorySlotData<BigInt>>(
            allowanceMapPointer,
            BigInt.ZERO,
        );

        this.balanceOfMap = new AddressMemoryMap<Address, MemorySlotData<BigInt>>(
            balanceOfMapPointer,
            BigInt.ZERO,
        );

        this._totalSupply = new StoredU256(totalSupplyPointer, BigInt.ZERO, BigInt.ZERO);

        this._maxSupply = new StoredU256(maxSupplyPointer, BigInt.ZERO, BigInt.ZERO);
        this._decimals = new StoredU256(decimalsPointer, BigInt.ZERO, BigInt.ZERO);

        this._name = new StoredString(namePointer, '');
        this._symbol = new StoredString(symbolPointer, '');

        if (params && this._maxSupply.value.isZero()) {
            this.instantiate(params, true);
        }
    }

    public _totalSupply: StoredU256;

    public get totalSupply(): BigInt {
        return this._totalSupply.value;
    }

    public get maxSupply(): BigInt {
        if (!this._maxSupply) throw new Revert('Max supply not set');

        return this._maxSupply.value;
    }

    public get decimals(): u8 {
        if (!this._decimals) throw new Revert('Decimals not set');

        return u8(this._decimals.value.toU32());
    }

    public get name(): string {
        if (!this._name) throw new Revert('Name not set');

        return this._name.value;
    }

    public get symbol(): string {
        if (!this._symbol) throw new Revert('Symbol not set');

        return this._symbol.value;
    }

    public instantiate(params: OP20InitParameters, skipOwnerVerification: boolean = false): void {
        if (!this._maxSupply.value.isZero()) {
            throw new Revert('Already initialized');
        }

        if (!skipOwnerVerification) this.onlyOwner(Blockchain.msgSender);

        if (params.decimals > 32) {
            throw new Revert('Decimals can not be more than 32');
        }

        this._maxSupply.value = params.maxSupply;
        this._decimals.value = BigInt.fromU32(u32(params.decimals));
        this._name.value = params.name;
        this._symbol.value = params.symbol;
    }

    /** METHODS */
    public allowance(callData: Calldata): BytesWriter {
        const response = new BytesWriter();

        const resp = this._allowance(callData.readAddress(), callData.readAddress());
        response.writeU256(resp);

        return response;
    }

    public approve(callData: Calldata): BytesWriter {
        // Define the owner and spender
        const owner = Blockchain.msgSender;
        const spender: Address = callData.readAddress();
        const value = callData.readU256();

        // Response buffer
        const response = new BytesWriter();

        const resp = this._approve(owner, spender, value);
        response.writeBoolean(resp);

        return response;
    }

    public balanceOf(callData: Calldata): BytesWriter {
        const response = new BytesWriter();
        const address: Address = callData.readAddress();
        const resp = this._balanceOf(address);

        response.writeU256(resp);

        return response;
    }

    public burn(callData: Calldata): BytesWriter {
        const response = new BytesWriter();
        const resp = this._burn(callData.readU256());
        response.writeBoolean(resp);

        return response;
    }

    public mint(callData: Calldata): BytesWriter {
        const response = new BytesWriter();
        const resp = this._mint(callData.readAddress(), callData.readU256());

        response.writeBoolean(resp);

        return response;
    }

    public transfer(callData: Calldata): BytesWriter {
        const response = new BytesWriter();
        const resp = this._transfer(callData.readAddress(), callData.readU256());

        response.writeBoolean(resp);

        return response;
    }

    public transferFrom(callData: Calldata): BytesWriter {
        const response = new BytesWriter();
        const resp = this._transferFrom(
            callData.readAddress(),
            callData.readAddress(),
            callData.readU256(),
        );

        response.writeBoolean(resp);

        return response;
    }

    public callMethod(method: Selector, calldata: Calldata): BytesWriter {
        switch (method) {
            case encodeSelector('allowance'):
                return this.allowance(calldata);
            case encodeSelector('approve'):
                return this.approve(calldata);
            case encodeSelector('balanceOf'):
                return this.balanceOf(calldata);
            case encodeSelector('burn'):
                return this.burn(calldata);
            case encodeSelector('mint'):
                return this.mint(calldata);
            case encodeSelector('transfer'):
                return this.transfer(calldata);
            case encodeSelector('transferFrom'):
                return this.transferFrom(calldata);
            default:
                return super.callMethod(method, calldata);
        }
    }

    public callView(method: Selector): BytesWriter {
        const response = new BytesWriter();

        switch (method) {
            case encodeSelector('decimals'):
                response.writeU8(this.decimals);
                break;
            case encodeSelector('name'):
                response.writeStringWithLength(this.name);
                break;
            case encodeSelector('symbol'):
                response.writeStringWithLength(this.symbol);
                break;
            case encodeSelector('totalSupply'):
                response.writeU256(this.totalSupply);
                break;
            case encodeSelector('maximumSupply'):
                response.writeU256(this.maxSupply);
                break;
            default:
                return super.callView(method);
        }

        return response;
    }

    /** REDEFINED METHODS */
    protected _allowance(owner: Address, spender: Address): BigInt {
        const senderMap = this.allowanceMap.get(owner);

        return senderMap.get(spender);
    }

    protected _approve(owner: Address, spender: Address, value: BigInt): boolean {
        if (owner === Blockchain.DEAD_ADDRESS || spender === Blockchain.DEAD_ADDRESS) {
            throw new Revert('Cannot approve from or to dead address');
        }

        const senderMap = this.allowanceMap.get(owner);
        senderMap.set(spender, value);

        this.createApproveEvent(owner, spender, value);

        return true;
    }

    protected _balanceOf(owner: Address): BigInt {
        const hasAddress = this.balanceOfMap.has(owner);
        if (!hasAddress) return BigInt.ZERO;

        return this.balanceOfMap.get(owner);
    }

    protected _burn(value: BigInt, onlyOwner: boolean = true): boolean {
        if (BigInt.eq(value, BigInt.ZERO)) {
            throw new Revert(`No tokens`);
        }

        if (onlyOwner) this.onlyOwner(Blockchain.msgSender);

        if (this._totalSupply.value < value) throw new Revert(`Insufficient total supply.`);
        if (!this.balanceOfMap.has(Blockchain.msgSender)) throw new Revert('No balance');

        const balance: BigInt = this.balanceOfMap.get(Blockchain.msgSender);
        if (balance < value) throw new Revert(`Insufficient balance`);

        const newBalance: BigInt = SafeMath.sub(balance, value);
        this.balanceOfMap.set(Blockchain.msgSender, newBalance);

        // @ts-expect-error TODO: Fix the typing because this is valid assembly-script syntax
        this._totalSupply -= value;

        this.createBurnEvent(value);
        return true;
    }

    protected _mint(to: Address, value: BigInt, onlyOwner: boolean = true): boolean {
        if (onlyOwner) this.onlyOwner(Blockchain.msgSender);

        if (!this.balanceOfMap.has(to)) {
            this.balanceOfMap.set(to, value);
        } else {
            const toBalance: BigInt = this.balanceOfMap.get(to);
            const newToBalance: BigInt = SafeMath.add(toBalance, value);

            this.balanceOfMap.set(to, newToBalance);
        }

        // @ts-expect-error TODO: Fix the typing because this is valid assembly-script syntax
        this._totalSupply += value;

        if (this._totalSupply.value > this.maxSupply) throw new Revert('Max supply reached');

        this.createMintEvent(to, value);
        return true;
    }

    protected _transfer(to: string, value: BigInt): boolean {
        const sender = Blockchain.msgSender;

        if (!this.balanceOfMap.has(sender)) throw new Revert();
        if (this.isSelf(sender)) throw new Revert('Can not transfer from self account');

        if (BigInt.eq(value, BigInt.ZERO)) {
            throw new Revert(`Cannot transfer 0 tokens`);
        }

        const balance: BigInt = this.balanceOfMap.get(sender);
        if (balance < value) throw new Revert(`Insufficient balance`);

        const newBalance: BigInt = SafeMath.sub(balance, value);
        this.balanceOfMap.set(sender, newBalance);

        const toBalance: BigInt = this.balanceOfMap.get(to);
        const newToBalance: BigInt = SafeMath.add(toBalance, value);

        this.balanceOfMap.set(to, newToBalance);

        this.createTransferEvent(sender, to, value);

        return true;
    }

    @unsafe
    protected _unsafeTransferFrom(from: Address, to: Address, value: BigInt): boolean {
        const balance: BigInt = this.balanceOfMap.get(from);
        if (balance < value)
            throw new Revert(
                `TransferFrom insufficient balance of ${from} is ${balance} and value is ${value}`,
            );

        const newBalance: BigInt = SafeMath.sub(balance, value);
        this.balanceOfMap.set(from, newBalance);

        if (!this.balanceOfMap.has(to)) {
            this.balanceOfMap.set(to, value);
        } else {
            const toBalance: BigInt = this.balanceOfMap.get(to);
            const newToBalance: BigInt = SafeMath.add(toBalance, value);

            this.balanceOfMap.set(to, newToBalance);
        }

        this.createTransferEvent(from, to, value);

        return true;
    }

    protected _transferFrom(from: Address, to: Address, value: BigInt): boolean {
        if (to === Blockchain.DEAD_ADDRESS || from === Blockchain.DEAD_ADDRESS) {
            throw new Revert('Cannot transfer to or from dead address');
        }

        this._spendAllowance(from, Blockchain.msgSender, value);
        this._unsafeTransferFrom(from, to, value);

        return true;
    }

    protected _spendAllowance(owner: Address, spender: Address, value: BigInt): void {
        const ownerAllowanceMap = this.allowanceMap.get(owner);
        const allowed: BigInt = ownerAllowanceMap.get(spender);

        if (allowed < value) {
            throw new Revert(
                `Insufficient allowance ${allowed} < ${value}. Spender: ${spender} - Owner: ${owner}`,
            );
        }

        const newAllowance: BigInt = SafeMath.sub(allowed, value);
        ownerAllowanceMap.set(spender, newAllowance);

        this.allowanceMap.set(owner, ownerAllowanceMap);
    }

    protected createBurnEvent(value: BigInt): void {
        const burnEvent = new BurnEvent(value);

        this.emitEvent(burnEvent);
    }

    protected createApproveEvent(owner: Address, spender: Address, value: BigInt): void {
        const approveEvent = new ApproveEvent(owner, spender, value);

        this.emitEvent(approveEvent);
    }

    protected createMintEvent(owner: Address, value: BigInt): void {
        const mintEvent = new MintEvent(owner, value);

        this.emitEvent(mintEvent);
    }

    protected createTransferEvent(from: Address, to: Address, value: BigInt): void {
        const transferEvent = new TransferEvent(from, to, value);

        this.emitEvent(transferEvent);
    }
}
