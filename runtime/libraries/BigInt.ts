// from 'as-bigint/assembly';

// multiple precision integer

import { Potential } from '../lang/Definitions';

export class BigInt {
    private static one: Potential<BigInt> = null;
    private static zero: Potential<BigInt> = null;

    // private static readonly b: u32 = BigInt.q ** BigInt.p; // digit basis
    // private static readonly q: i32 = 2;
    private static readonly p: i32 = 28; // bits used in digit

    // private static readonly doubleActualBits: i32 = 64 // 2 * BigIntMP.actualBits -> "double precision" actual bits
    private static readonly actualBits: i32 = 32; // bits available in type (single precision)
    private static readonly maxComba: i32 = 256; // 2^(doubleActualBits - 2 * p) = 2^8 = 256
    private static readonly digitMask: u32 = <u32>((1 << BigInt.p) - 1); // mask p least significant bits
    private static readonly precision: i32 = 10; // base array size fits 140 bit integers

    private d: Uint32Array; // digits
    private n: i32 = 0; // digits used
    private isNeg: boolean; // sign

    // private static readonly maxBits: i32 = I32.MAX_VALUE;
    // private static readonly maxN: i32 = BigInt.maxBits / BigInt.p;

    // CONSTRUCTORS //////////////////////////////////////////////////////////////////////////////////////////////////////

    private constructor(size: i32 = BigInt.precision, isNegative: boolean = false) {
        this.d = new Uint32Array(size);
        this.isNeg = isNegative;
    }

    // BigInt with value 0
    static get ZERO(): BigInt {
        if (!(BigInt.zero instanceof BigInt)) {
            BigInt.zero = BigInt.fromU16(0);
        }

        return BigInt.zero as BigInt;
    }

    // BigInt with value 1
    static get ONE(): BigInt {
        if (!(BigInt.one instanceof BigInt)) {
            BigInt.one = BigInt.fromU16(1);
        }

        return BigInt.one as BigInt;
    }

    static get MAX_SAFE_U256(): BigInt {
        return BigInt.fromBytesLE([
            255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
            255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
        ]); // 115792089237316195423570985008687907853269984665640564039457584007913129639935
    }

    // BigInt with value -1
    static get NEG_ONE(): BigInt {
        const res: BigInt = BigInt.fromU16(1);
        res.isNeg = true;
        return res;
    }

    get isNegative(): boolean {
        return this.isNeg;
    }

    // Converts an array of bytes to a BigInt.
    @inline
    static fromBytes<T extends ArrayLike<u8>>(array: T, bigEndian: bool = false): BigInt {
        let res = BigInt.ZERO;
        if (bigEndian) {
            for (let i = 0; i < array.length; i++) {
                res = res.lsh(8).add(BigInt.fromU32(array[i]));
            }
        } else {
            let multiplier = BigInt.ONE;
            for (let i = 0; i < array.length; i++) {
                res = res.add(BigInt.fromU32(array[i]).mul(multiplier));
                multiplier = multiplier.mulInt(256);
            }
        }
        return res;
    }

    // Converts a little-endian byte array to a BigInt.
    @inline
    static fromBytesLE(array: u8[]): BigInt {
        return BigInt.fromBytes(array, false);
    }

    // Converts a big-endian byte array to a BigInt.
    @inline
    static fromBytesBE(array: u8[]): BigInt {
        return BigInt.fromBytes(array, true);
    }

    // Converts a little-endian Uint8Array to a BigInt.
    @inline
    static fromUint8ArrayLE(array: Uint8Array): BigInt {
        return BigInt.fromBytes(array, false);
    }

    // Converts a big-endian Uint8Array to a BigInt.
    @inline
    static fromUint8ArrayBE(array: Uint8Array): BigInt {
        return BigInt.fromBytes(array, true);
    }

    // generic constructor based on https://github.com/ttulka/as-big/blob/main/assembly/Big.ts#L84
    /**
     * Returns a new {BigInt} instance from generic type {T}.
     *
     * @param  val the number as {BigInt}, {string}, or {number}
     * @return BigInt the new {BigInt} instance
     */
    static from<T>(val: T): BigInt {
        if (val instanceof BigInt) return val;
        // @ts-expect-error Valid type in assemblyscript
        if (val instanceof String) return BigInt.fromString(val);
        if (val instanceof i8) return BigInt.fromI16(<i16>val);
        if (val instanceof u8) return BigInt.fromU16(<u16>val);
        // @ts-expect-error Valid type in assemblyscript
        if (val instanceof i16) return BigInt.fromI16(val);
        // @ts-expect-error Valid type in assemblyscript
        if (val instanceof u16) return BigInt.fromU16(val);
        // @ts-expect-error Valid type in assemblyscript
        if (val instanceof i32) return BigInt.fromI32(val);
        // @ts-expect-error Valid type in assemblyscript
        if (val instanceof u32) return BigInt.fromU32(val);
        // @ts-expect-error Valid type in assemblyscript
        if (val instanceof i64) return BigInt.fromI64(val);
        // @ts-expect-error Valid type in assemblyscript
        if (val instanceof u64) return BigInt.fromU64(val);

        throw new TypeError('Unsupported generic type ' + nameof<T>(val));
    }

    static fromString(bigInteger: string, radix: i32 = 10): BigInt {
        if (radix < 2 || radix > 16) {
            throw new RangeError('BigInt only reads strings of radix 2 through 16');
        }
        let i: i32 = 0;
        let isNegative: boolean = false;
        if (bigInteger.charAt(0) == '-') {
            i++;
            isNegative = true;
        }
        if (
            (radix == 16 || radix == 10) &&
            bigInteger.charAt(i) == '0' &&
            bigInteger.charAt(i + 1) == 'x'
        ) {
            i += 2;
            radix = 16;
        }
        let res: BigInt = BigInt.fromU16(0);
        const radixU: u16 = <u16>radix;
        for (; i < bigInteger.length; i++) {
            const code: i32 = bigInteger.charCodeAt(i);
            let val: u16;
            if (code >= 48 && code <= 57) {
                val = <u16>(code - 48);
            } else if (code >= 65 && code <= 70) {
                val = <u16>(code - 55);
            } else if (code >= 97 && code <= 102) {
                val = <u16>(code - 87);
            } else {
                throw new RangeError(
                    'Character ' +
                        bigInteger.charAt(i) +
                        ' is not supported for radix ' +
                        radix.toString(),
                );
            }
            res = res.inplaceMulInt(radixU).add(BigInt.fromU16(val));
        }
        res.isNeg = isNegative;
        res.trimLeadingZeros();
        return res;
    }

    static fromU16(val: u16): BigInt {
        const res = new BigInt(BigInt.precision, false);
        res.d[0] = (<u32>val) & BigInt.digitMask;
        res.n = res.d[0] != 0 ? 1 : 0;
        return res;
    }

    static fromU32(val: u32): BigInt {
        const res = new BigInt(BigInt.precision, false);
        let i = 0;
        while (val != 0) {
            res.d[i++] = val & BigInt.digitMask;
            val >>= BigInt.p;
        }
        res.n = i;
        res.trimLeadingZeros();
        return res;
    }

    static fromU64(val: u64): BigInt {
        const res = new BigInt(BigInt.precision, false);
        let i = 0;
        while (val != 0) {
            res.d[i++] = (<u32>val) & BigInt.digitMask;
            val >>= BigInt.p;
        }
        res.n = i;
        res.trimLeadingZeros();
        return res;
    }

    static fromI16(val: i16): BigInt {
        const isNeg: boolean = val < 0;
        const res = new BigInt(BigInt.precision, isNeg);
        const unsignedDigit: u16 = <u16>(isNeg ? -1 * val : val);
        res.d[0] = (<u32>unsignedDigit) & BigInt.digitMask;
        res.n = res.d[0] != 0 ? 1 : 0;
        return res;
    }

    static fromI32(val: i32): BigInt {
        const isNeg: boolean = val < 0;
        const res = new BigInt(BigInt.precision, isNeg);
        let unsignedDigit: u32 = <u32>(isNeg ? -1 * val : val);
        let i = 0;
        while (unsignedDigit != 0) {
            res.d[i++] = unsignedDigit & BigInt.digitMask;
            unsignedDigit >>= BigInt.p;
        }
        res.n = i;
        res.trimLeadingZeros();
        return res;
    }

    static fromI64(val: i64): BigInt {
        const isNeg: boolean = val < 0;
        const res = new BigInt(BigInt.precision, isNeg);
        let unsignedDigit: u64 = <u64>(isNeg ? -1 * val : val);
        let i = 0;
        while (unsignedDigit != 0) {
            res.d[i++] = (<u32>unsignedDigit) & BigInt.digitMask;
            unsignedDigit >>= BigInt.p;
        }
        res.n = i;
        res.trimLeadingZeros();
        return res;
    }

    static eq<T, U>(left: T, right: U): boolean {
        const a: BigInt = BigInt.from(left);
        return a.eq(right);
    }

    static ne<T, U>(left: T, right: U): boolean {
        const a: BigInt = BigInt.from(left);
        return a.ne(right);
    }

    static lt<T, U>(left: T, right: U): boolean {
        const a: BigInt = BigInt.from(left);
        return a.lt(right);
    }

    static lte<T, U>(left: T, right: U): boolean {
        const a: BigInt = BigInt.from(left);
        return a.lte(right);
    }

    static gt<T, U>(left: T, right: U): boolean {
        const a: BigInt = BigInt.from(left);
        return a.gt(right);
    }

    // MAINTENANCE FUNCTIONS /////////////////////////////////////////////////////////////////////////////////////////////

    static gte<T, U>(left: T, right: U): boolean {
        const a: BigInt = BigInt.from(left);
        return a.gte(right);
    }

    static add<T, U>(left: T, right: U): BigInt {
        const a: BigInt = BigInt.from(left);
        return a.add(right);
    }

    static sub<T, U>(left: T, right: U): BigInt {
        const a: BigInt = BigInt.from(left);
        return a.sub(right);
    }

    // OUTPUT /////////////////////////////////////////////////////////////////////////////////////////////////////

    static mul<T, U>(left: T, right: U): BigInt {
        const a: BigInt = BigInt.from(left);
        return a.mul(right);
    }

    static div<T, U>(left: T, right: U): BigInt {
        const a: BigInt = BigInt.from(left);
        return a.div(right);
    }

    @operator('/')
    static divOp(left: BigInt, right: BigInt): BigInt {
        return left.div(right);
    }

    static mod<T, U>(left: T, right: U): BigInt {
        const a: BigInt = BigInt.from(left);
        return a.mod(right);
    }

    static pow<T>(base: T, k: i32): BigInt {
        const x: BigInt = BigInt.from(base);
        return x.pow(k);
    }

    // COMPARISON OPERATORS //////////////////////////////////////////////////////////////////////////////////////////////

    static bitwiseNot<T>(a: T): BigInt {
        return BigInt.from(a).not();
    }

    static bitwiseAnd<T, U>(a: T, b: U): BigInt {
        const left: BigInt = BigInt.from(a);
        return left.and(b);
    }

    static bitwiseOr<T, U>(a: T, b: U): BigInt {
        const left: BigInt = BigInt.from(a);
        return left.or(b);
    }

    static bitwiseXor<T, U>(a: T, b: U): BigInt {
        const left: BigInt = BigInt.from(a);
        return left.xor(b);
    }

    // O(N)
    private static fromDigits(
        digits: Uint32Array,
        isNegative: boolean = false,
        n: i32 = digits.length,
        minSize: i32 = digits.length,
    ): BigInt {
        let size = minSize;
        if (size < digits.length) {
            size = digits.length;
        }
        const extra = size % BigInt.precision;
        if (extra != 0) {
            size += BigInt.precision - extra;
        }
        const res: BigInt = new BigInt(size, isNegative);
        for (let i = 0; i < digits.length; i++) {
            res.d[i] = digits[i];
        }
        res.n = n;
        return res;
    }

    private static getEmptyResultContainer(minSize: i32, isNegative: boolean, n: i32): BigInt {
        const size: i32 = minSize + BigInt.precision - (minSize % BigInt.precision);
        const res: BigInt = new BigInt(size, isNegative);
        res.n = n;
        return res;
    }

    private static rightShiftByMaximum(isNeg: boolean): BigInt {
        if (isNeg) {
            return BigInt.NEG_ONE;
        }
        return BigInt.ZERO;
    }

    // unsigned bitwise AND
    private static _and(a: BigInt, b: BigInt): BigInt {
        const numPairs: i32 = a.n < b.n ? a.n : b.n;
        const res: BigInt = BigInt.getEmptyResultContainer(numPairs, false, numPairs);

        let i = 0;
        for (; i < numPairs; i++) {
            res.d[i] = a.d[i] & b.d[i];
        }
        return res;
    }

    // CORE MATH OPERATIONS //////////////////////////////////////////////////////////////////////////////////////////////

    // unsigned bitwise OR
    private static _or(a: BigInt, b: BigInt): BigInt {
        let numPairs: i32;
        let resLength: i32;
        if (a.n > b.n) {
            numPairs = b.n;
            resLength = a.n;
        } else {
            numPairs = a.n;
            resLength = b.n;
        }
        const res: BigInt = BigInt.getEmptyResultContainer(resLength, false, resLength);

        let i = 0;
        for (; i < numPairs; i++) {
            res.d[i] = a.d[i] | b.d[i];
        }
        for (; i < a.n; i++) {
            res.d[i] = a.d[i];
        }
        for (; i < b.n; i++) {
            res.d[i] = b.d[i];
        }
        return res;
    }

    // unsigned bitwise XOR
    private static _xor(a: BigInt, b: BigInt): BigInt {
        let numPairs: i32;
        let resLength: i32;
        if (a.n > b.n) {
            numPairs = b.n;
            resLength = a.n;
        } else {
            numPairs = a.n;
            resLength = b.n;
        }
        const res: BigInt = BigInt.getEmptyResultContainer(resLength, false, resLength);

        let i = 0;
        for (; i < numPairs; i++) {
            res.d[i] = a.d[i] ^ b.d[i];
        }
        for (; i < a.n; i++) {
            res.d[i] = a.d[i];
        }
        for (; i < b.n; i++) {
            res.d[i] = b.d[i];
        }
        return res;
    }

    private static isPow2(b: u32): i32 {
        for (let i = 1; i < BigInt.p; i++) {
            if (b == (<u32>1) << i) {
                return i;
            }
        }
        return 0;
    }

    @operator('==')
    private static eqOp(left: BigInt, right: BigInt): boolean {
        return left.eq(right);
    }

    @operator('!=')
    private static neOp(left: BigInt, right: BigInt): boolean {
        return left.ne(right);
    }

    @operator('<')
    private static ltOp(left: BigInt, right: BigInt): boolean {
        return left.lt(right);
    }

    @operator('<=')
    private static lteOp(left: BigInt, right: BigInt): boolean {
        return left.lte(right);
    }

    @operator('>')
    private static gtOp(left: BigInt, right: BigInt): boolean {
        return left.gt(right);
    }

    // multiples BigInt by power of basis

    @operator('>=')
    private static gteOp(left: BigInt, right: BigInt): boolean {
        return left.gte(right);
    }

    // divides BigInt by power of basis

    @operator('+')
    private static addOp(left: BigInt, right: BigInt): BigInt {
        return left.add(right);
    }

    // multiply by power of 2

    @operator('-')
    private static subOp(left: BigInt, right: BigInt): BigInt {
        return left.sub(right);
    }

    @operator('*')
    private static mulOp(left: BigInt, right: BigInt): BigInt {
        return left.mul(right);
    }

    @operator('%')
    private static modOp(left: BigInt, right: BigInt): BigInt {
        return left.mod(right);
    }

    // note: the right-hand operand must be a positive integer that fits in an i32
    @operator('**')
    private static powOp(left: BigInt, right: BigInt): BigInt {
        return left.pow(right.toI32());
    }

    // note: the right-hand operand must be a positive integer that fits in an i32
    @operator('<<')
    private static lhr(left: BigInt, right: BigInt): BigInt {
        return left.lsh(right.toI32());
    }

    // note: the right-hand operand must be a positive integer that fits in an i32
    @operator('>>')
    private static shr(left: BigInt, right: BigInt): BigInt {
        return left.shr(right.toI32());
    }

    @operator('&')
    private static and(a: BigInt, b: BigInt): BigInt {
        return a.and(b);
    }

    // For negative numbers, round down if any bit was shifted out (so that
    // e.g. -5n >> 1n == -3n and not -2n). Check now whether this will happen
    // and whether it can cause overflow into a new digit. If we allocate the

    @operator('|')
    private static or(a: BigInt, b: BigInt): BigInt {
        return a.or(b);
    }

    @operator('^')
    private static xor(a: BigInt, b: BigInt): BigInt {
        return a.xor(b);
    }

    // MULTIPLICATION ////////////////////////////////////////////////////////////////////////////////////////////////////

    // Converts the BigInt to an array of bytes.
    @inline
    toBytes(bigEndian: bool = false, u256Mode: bool = true): u8[] {
        const res = new Array<u8>();
        let temp = this.abs();
        if (temp.isZero()) {
            res.push(0);
        } else {
            while (!temp.isZero()) {
                res.push(<u8>temp.modInt(256));
                temp = temp.divInt(256);
            }
        }

        if (u256Mode) {
            // we need to make sure it always has 32 bytes

            while (res.length < 32) {
                res.push(0);
            }
        }

        if (bigEndian) {
            res.reverse();
        }

        return res;
    }

    // Converts the BigInt to a StaticArray of bytes.
    @inline
    toStaticBytes(bigEndian: bool = false): StaticArray<u8> {
        const bytes = this.toBytes(bigEndian);
        return StaticArray.fromArray(bytes);
    }

    // Converts the BigInt to a Uint8Array.
    @inline
    toUint8Array(bigEndian: bool = false): Uint8Array {
        const bytes = this.toBytes(bigEndian);
        const uint8Array = new Uint8Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) {
            uint8Array[i] = bytes[i];
        }

        return uint8Array;
    }

    // EXPONENTIATION ////////////////////////////////////////////////////////////////////////////////////////////////////

    // O(N)
    copy(): BigInt {
        return BigInt.fromDigits(this.d, this.isNeg, this.n);
    }

    // O(N)
    opposite(): BigInt {
        return BigInt.fromDigits(this.d, this.n > 0 && !this.isNeg, this.n);
    }

    // O(N)
    abs(): BigInt {
        return BigInt.fromDigits(this.d, false, this.n);
    }

    toString(radix: i32 = 10): string {
        if (radix < 2 || radix > 16) {
            throw new RangeError('BigInt only prints strings in radix 2 through 16');
        }
        if (this.n == 0) return '0';
        let res: string = this.isNeg ? '-' : '';
        let t: BigInt = this.abs();
        const zero: BigInt = BigInt.fromU16(0);
        const codes: i32[] = [];
        const radixU: u32 = <u32>radix;
        while (t.ne(zero)) {
            const d: i32 = <i32>t.modInt(radixU);
            t = t.inplaceDivInt(radixU);
            if (d < 10) {
                codes.push(d + 48);
            } else {
                codes.push(d + 87);
            }
        }
        codes.reverse();
        res += String.fromCharCodes(codes);
        return res;
    }

    toI32(): i32 {
        if (this.n <= 1) {
            return this.n == 0 ? <i32>0 : <i32>this.d[0] * (this.isNeg ? -1 : 1);
        }
        const bitCount: i32 = this.countBits();
        if (bitCount > 32) {
            throw new Error(
                `Integer overflow: cannot output i32 from an integer that uses ${bitCount} bits`,
            );
        }
        const biString: string = this.toString();
        const result: i32 = i32.parse(biString);
        if (bitCount == 32 && result.toString() != biString) {
            throw new Error('Signed integer overflow');
        }
        return result;
    }

    // DIVISION //////////////////////////////////////////////////////////////////////////////////////////////////////////

    toI64(): i64 {
        if (this.n <= 1) {
            return this.n == 0 ? <i64>0 : <i64>this.d[0] * (this.isNeg ? -1 : 1);
        }
        const bitCount: i32 = this.countBits();
        if (bitCount > 64) {
            throw new Error(
                `Integer overflow: cannot output i64 from an integer that uses ${bitCount} bits`,
            );
        }
        const biString: string = this.toString();
        const result: i64 = i64.parse(biString);
        if (bitCount == 64 && result.toString() != biString) {
            throw new Error('Signed integer overflow');
        }
        return result;
    }

    toBool(): bool {
        return !this.isZero();
    }

    toU32(): u32 {
        if (this.isNeg) {
            throw new Error('Cannot cast negative integer to u32');
        }
        if (this.n <= 1) {
            return this.n == 0 ? <u32>0 : <u32>this.d[0];
        }
        const bitCount: i32 = this.countBits();
        if (bitCount > 32) {
            throw new Error(
                `Integer overflow: cannot output u32 from an integer that uses ${bitCount} bits`,
            );
        }
        return u32.parse(this.toString());
    }

    toU64(): u64 {
        if (this.isNeg) {
            throw new Error('Cannot cast negative integer to u64');
        }
        if (this.n <= 1) {
            return this.n == 0 ? <u64>0 : <u64>this.d[0];
        }
        const bitCount: i32 = this.countBits();
        if (bitCount > 64) {
            throw new Error(
                `Integer overflow: cannot output u64 from an integer that uses ${bitCount} bits`,
            );
        }
        return u64.parse(this.toString());
    }

    // TODO: fast division has bug(s) -> using "slow" division
    // private _fastDiv(other: BigInt): BigInt[] {
    //   if (other.eq(BigInt.fromUInt16(0))) {
    //     throw new Error("Divide by zero");
    //   }
    //   const cmp: i32 = this.magCompareTo(other);
    //   if (cmp < 0) {
    //     return [BigInt.fromUInt16(0), this.copy()];
    //   } else if (cmp == 0) {
    //     const q = BigInt.fromUInt16(1);
    //     q.isNeg = this.isNeg != other.isNeg;
    //     return [q, BigInt.fromUInt16(0)];
    //   }
    //   // set up numbers
    //   let q: BigInt = BigInt.getEmptyResultContainer(
    //     this.n + 2,
    //     this.isNeg != other.isNeg,
    //     this.n + 2
    //   );
    //   let x: BigInt = this.abs();
    //   let y: BigInt = other.abs();
    //   // norm leading digits of x and y
    //   let norm: i32 = y.countBits() % BigInt.p;
    //   if (norm < BigInt.p - 1) {
    //     norm = BigInt.p - 1 - norm;
    //     x = x.mulPowTwo(norm);
    //     y = y.mulPowTwo(norm);
    //   } else {
    //     norm = 0;
    //   }
    //
    //   // find leading digit of quotient
    //   const n: i32 = this.n - 1;
    //   const t: i32 = other.n - 1;
    //   const nSubt = n - t;
    //   y.mulBasisPow(nSubt);
    //   while (x.compareTo(y) >= 0) {
    //     q.d[nSubt]++;
    //     x = x.sub(y);
    //   }
    //   y.divBasisPow(nSubt);
    //   // find remainder of digits
    //   let temp1: BigInt;
    //   let temp2: BigInt;
    //   for (let i = n; i > t; i--) {
    //     if (i > x.n) continue;
    //     if (x.d[i] == y.d[t]) {
    //       q.d[i - t - 1] = (<u32>1 << BigInt.p) - 1;
    //     } else {
    //       let r: u64 = (<u64>x.d[i]) << (<u64>BigInt.p);
    //       r |= <u64>x.d[i - 1];
    //       r /= <u64>y.d[t];
    //       if (r > <u64>BigInt.digitMask) {
    //         r = <u64>BigInt.digitMask;
    //       }
    //       q.d[i - t - 1] = <u32>(r & (<u64>BigInt.digitMask));
    //     }
    //     // fix up quotient estimation
    //     q.d[i - t - 1] = ++q.d[i - t - 1] & BigInt.digitMask;
    //     do {
    //       q.d[i - t - 1] = --q.d[i - t - 1] & BigInt.digitMask;
    //       // find left
    //       temp1 = BigInt.getEmptyResultContainer(2, false, 2);
    //       temp1.d[0] = t - 1 < 0 ? 0 : y.d[t - 1];
    //       temp1.d[1] = y.d[t];
    //       temp1 = temp1.mulInt(q.d[i - t - 1]);
    //       // find right
    //       temp2 = BigInt.getEmptyResultContainer(3, false, 3);
    //       temp2.d[0] = i - 2 < 0 ? 0 : x.d[i - 2];
    //       temp2.d[1] = i - 1 < 0 ? 0 : x.d[i - 1];
    //       temp2.d[2] = x.d[i];
    //     } while (temp1.magCompareTo(temp2) > 0);
    //
    //     temp1 = y.mulInt(q.d[i - t - 1]);
    //     temp1.mulBasisPow(i - t - 1);
    //     x = x.sub(temp1);
    //     if (x.isNeg) {
    //       temp1 = y.copy();
    //       temp1.mulBasisPow(i - t - 1);
    //       x = x.add(temp1);
    //       q.d[i - t - 1] = --q.d[i - t - 1] & BigInt.digitMask;
    //     }
    //   }
    //   // finalize
    //   q.trimLeadingZeros();
    //   x.isNeg = x.n != 0 && this.isNeg;
    //   const r: BigInt = x.divPowTwo(norm);
    //   return [q, r];
    // }

    eq<T>(other: T): boolean {
        return this.compareTo(BigInt.from(other)) == 0;
    }

    ne<T>(other: T): boolean {
        return !this.eq(BigInt.from(other));
    }

    lt<T>(other: T): boolean {
        return this.compareTo(BigInt.from(other)) < 0;
    }

    lte<T>(other: T): boolean {
        return this.compareTo(BigInt.from(other)) <= 0;
    }

    gt<T>(other: T): boolean {
        return this.compareTo(BigInt.from(other)) > 0;
    }

    // SINGLE-DIGIT HELPERS //////////////////////////////////////////////////////////////////////////////////////////////

    gte<T>(other: T): boolean {
        return this.compareTo(BigInt.from(other)) >= 0;
    }

    compareTo(other: BigInt): i32 {
        // opposite signs
        if (this.isNeg && !other.isNeg) {
            return -1;
        } else if (!this.isNeg && other.isNeg) {
            return 1;
        } else if (this.isNeg) {
            return other.magCompareTo(this);
        } else {
            return this.magCompareTo(other);
        }
    }

    magCompareTo(other: BigInt): i32 {
        if (this.n > other.n) return 1;
        if (this.n < other.n) return -1;
        for (let i = this.n - 1; i >= 0; i--) {
            if (this.d[i] != other.d[i]) {
                if (this.d[i] < other.d[i]) return -1;
                else return 1;
            }
        }
        return 0;
    }

    // signed addition
    add<T>(other: T): BigInt {
        const addend: BigInt = BigInt.from(other);
        if (this.isNeg == addend.isNeg) {
            return this._add(addend, this.isNeg);
        } else if (this.magCompareTo(addend) < 0) {
            return addend._sub(this, addend.isNeg);
        } else {
            return this._sub(addend, this.isNeg);
        }
    }

    // signed subtraction
    sub<T>(other: T): BigInt {
        const subtrahend: BigInt = BigInt.from(other);
        if (this.isNeg != subtrahend.isNeg) {
            return this._add(subtrahend, this.isNeg);
        } else if (this.magCompareTo(subtrahend) >= 0) {
            return this._sub(subtrahend, this.isNeg);
        } else {
            return subtrahend._sub(this, !this.isNeg);
        }
    }

    // efficient multiply by 2
    mul2(): BigInt {
        const res: BigInt = BigInt.getEmptyResultContainer(this.n + 1, this.isNeg, this.n);
        let r: u32 = 0;
        for (let i = 0; i < this.n; i++) {
            const rr: u32 = this.d[i] >> (BigInt.p - 1);
            res.d[i] = ((this.d[i] << 1) | r) & BigInt.digitMask;
            r = rr;
        }
        if (r != 0) {
            res.d[res.n++] = 1;
        }
        return res;
    }

    // efficient div by 2
    div2(): BigInt {
        const res: BigInt = BigInt.getEmptyResultContainer(this.n, this.isNeg, this.n);
        let r: u32 = 0;
        for (let i = this.n - 1; i >= 0; i--) {
            const rr: u32 = this.d[i] % 2;
            res.d[i] = (this.d[i] >> 1) | (r << (BigInt.p - 1));
            r = rr;
        }
        res.trimLeadingZeros();
        return res;
    }

    // O(2N)
    mulPowTwo(k: i32): BigInt {
        if (k <= 0) {
            return this.copy();
        }
        const minSize: i32 = this.n + k / BigInt.p + 1;
        const res = BigInt.fromDigits(this.d, this.isNeg, this.n, minSize);
        // shift by entire digits
        if (k >= BigInt.p) {
            res.mulBasisPow(k / BigInt.p);
        }
        // shift by k % p bits
        const remK: i32 = k % BigInt.p;
        if (remK != 0) {
            const mask: u32 = <u32>((1 << remK) - 1);
            const shift: i32 = BigInt.p - remK;
            let r: u32 = 0;
            for (let i = 0; i < res.n; i++) {
                const rr: u32 = (res.d[i] >> shift) & mask;
                res.d[i] = ((res.d[i] << remK) | r) & BigInt.digitMask;
                r = rr;
            }
            if (r != 0) {
                res.d[res.n++] = r;
            }
        }
        return res;
    }

    // divide by power of 2
    divPowTwo(k: i32): BigInt {
        const res = this.copy();
        if (k <= 0) {
            return res;
        }
        if (k >= BigInt.p) {
            res.divBasisPow(k / BigInt.p);
        }
        const remK: i32 = k % BigInt.p;
        if (remK != 0) {
            const mask: u32 = <u32>((1 << remK) - 1);
            const shift: i32 = BigInt.p - remK;
            let r: u32 = 0;
            for (let i = res.n - 1; i >= 0; i--) {
                const rr: u32 = res.d[i] & mask;
                res.d[i] = (res.d[i] >> remK) | (r << shift);
                r = rr;
            }
        }
        res.trimLeadingZeros();
        return res;
    }

    // BITWISE OPERATIONS ////////////////////////////////////////////////////////////////////////////////////////////////

    // remainder of division by power of 2
    modPowTwo(k: i32): BigInt {
        if (k == 0) {
            return BigInt.fromU16(<u16>0);
        }
        const res = this.copy();
        // if 2^k > BigInt, then BigInt % 2^k == BigInt
        if (k > this.n * BigInt.p) {
            return res;
        }
        // zero out unused digits (any digit greater than 2^b)
        const kDivP: i32 = k / BigInt.p;
        let i: i32 = kDivP + (k % BigInt.p) == 0 ? 0 : 1; // ceil of k / p
        for (; i < res.n; i++) {
            res.d[i] = 0;
        }
        // mod the remaining leading digit (which includes 2^b) using bitmask
        // remK = k % BigIntMP.p
        res.d[kDivP] &= ((<u32>1) << k % BigInt.p) - <u32>1;
        // trim and return
        res.trimLeadingZeros();
        return res;
    }

    // left bit shift
    lsh(k: i32): BigInt {
        if (k == 0) return this.copy();
        if (k < 0) return this.rightShiftByAbsolute(k);
        return this.leftShiftByAbsolute(k);
    }

    // signed right bit shift
    shr(k: i32): BigInt {
        if (k == 0) return this.copy();
        if (k < 0) return this.leftShiftByAbsolute(k);
        return this.rightShiftByAbsolute(k);
    }

    // chooses best multiplication algorithm for situation and handles sign
    mul<T>(other: T): BigInt {
        const multiplier: BigInt = BigInt.from(other);
        let res: BigInt;
        const digitsNeeded: i32 = this.n + multiplier.n + 1;
        const minN: i32 = this.n <= multiplier.n ? this.n : multiplier.n;
        if (digitsNeeded < BigInt.maxComba && minN < BigInt.maxComba) {
            res = this._mulComba(multiplier, digitsNeeded);
        } else {
            res = this._mulPartial(multiplier, digitsNeeded);
        }
        res.isNeg = this.isNeg != multiplier.isNeg && res.n > 0;
        return res;
    }

    pow(k: i32): BigInt {
        if (k < 0) {
            throw new RangeError('BigInt does not support negative exponentiation');
        }
        let temp: BigInt = this.copy();
        let res: BigInt = BigInt.ONE;
        while (k > 0) {
            /* if the bit is set multiply */
            if ((k & 1) != 0) res = res.mul(temp);
            /* square */
            if (k > 1) temp = temp.square();
            /* shift to next bit */
            k >>= 1;
        }
        return res;
    }

    square(): BigInt {
        const digitsNeeded: i32 = this.n + this.n + 1;
        if (digitsNeeded < BigInt.maxComba) {
            return this._squareComba();
        } else {
            return this._baseSquare();
        }
    }

    sqrt(): BigInt {
        if (this.isNeg) throw new RangeError('Square root of negative numbers is not supported');
        if (this.n == 0) return this.copy();

        // rely on built in sqrt if possible
        if (this.lte(BigInt.fromU64(<u64>F64.MAX_SAFE_INTEGER))) {
            const fVal: f64 = <f64>this.toU64();
            const fSqrt: f64 = Math.floor(Math.sqrt(fVal));
            return BigInt.fromU64(<u64>fSqrt);
        }

        // Newton Raphson iteration
        let z: BigInt = this; // eslint-disable-line  @typescript-eslint/no-this-alias
        let x: BigInt = BigInt.fromU16(1).mulPowTwo(this.countBits() / 2);
        x = this.div(x).add(x).div2();
        while (x < z) {
            z = x;
            x = this.div(x).add(x).div2();
        }

        return z;
    }

    // handles sign and allows for easy replacement of algorithm in future update
    div<T>(other: T): BigInt {
        return this._div(BigInt.from(other));
    }

    // UTILITY ///////////////////////////////////////////////////////////////////////////////////////////////////////////

    // handles sign and allows for easy replacement of algorithm in future update
    mod<T>(other: T): BigInt {
        return this._divRemainder(BigInt.from(other));
    }

    // returns [quotient, remainder]
    divMod<T>(other: T): BigInt[] {
        return this._divMod(BigInt.from(other));
    }

    // divides and rounds to nearest integer
    roundedDiv<T>(other: T): BigInt {
        const divisor: BigInt = BigInt.from(other);
        if (divisor.eq(BigInt.fromU16(0))) {
            throw new Error('Divide by zero');
        }
        if (this.isZero()) {
            return BigInt.fromU16(0);
        }
        const r: BigInt = divisor.div2();
        if (this.isNeg != divisor.isNeg) {
            r.isNeg = !r.isNeg;
        }
        return this.add(r).div(divisor);
    }

    addInt(b: u32): BigInt {
        return this.add(BigInt.fromU32(b));
    }

    // SYNTAX SUGAR ///////////////////////////////////////////////////////////////////////////////////////////////////

    subInt(b: u32): BigInt {
        return this.sub(BigInt.fromU32(b));
    }

    mulInt(b: u32): BigInt {
        if (b > 268435456) {
            return this.mul(BigInt.fromU32(b));
        }
        const res = BigInt.fromDigits(this.d, this.isNeg, this.n, this.n + 1);
        let r: u32 = 0;
        for (let i = 0; i < this.n; i++) {
            const rr: u64 = <u64>this.d[i] * <u64>b + <u64>r;
            res.d[i] = <u32>(rr & (<u64>BigInt.digitMask));
            r = <u32>(rr >> BigInt.p);
        }
        if (r != 0) {
            res.d[res.n++] = r;
        }
        return res;
    }

    divInt(b: u32): BigInt {
        if (b == 0) throw new Error('Divide by zero');
        // try optimizations
        if (b == 1 || this.n == 0) return this.copy();
        const pow2Bit: i32 = BigInt.isPow2(b);
        if (pow2Bit != 0) return this.divPowTwo(pow2Bit);
        // divide
        const q = BigInt.getEmptyResultContainer(this.n, this.isNeg, this.n);
        let r: u64 = 0;
        let val: u32;
        for (let i = this.n - 1; i >= 0; i--) {
            r = (r << BigInt.p) | (<u64>this.d[i]);
            if (r >= b) {
                val = <u32>(r / b);
                r -= <u64>val * <u64>b;
            } else {
                val = 0;
            }
            q.d[i] = val;
        }
        q.trimLeadingZeros();
        return q;
    }

    modInt(b: u32): u32 {
        if (b == 0) throw new Error('Divide by zero');
        // try optimizations
        if (b == 1 || this.n == 0) {
            return 0;
        }
        const pow2Bit: i32 = BigInt.isPow2(b);
        if (pow2Bit != 0) {
            return this.d[0] & (((<u32>1) << pow2Bit) - <u32>1);
        }
        // divide
        let r: u64 = 0;
        let val: u32;
        for (let i = this.n - 1; i >= 0; i--) {
            r = (r << BigInt.p) | (<u64>this.d[i]);
            if (r >= b) {
                val = <u32>(r / b);
                r -= <u64>val * <u64>b;
            } else {
                val = 0;
            }
        }
        return <u32>r;
    }

    // returns [quotient, remainder]
    divModInt(b: u32): BigInt[] {
        if (b == 0) throw new Error('Divide by zero');
        // try optimizations
        if (b == 1 || this.n == 0) {
            return [this.copy(), BigInt.ZERO];
        }
        const pow2Bit: i32 = BigInt.isPow2(b);
        if (pow2Bit != 0) {
            const q: BigInt = this.divPowTwo(pow2Bit);
            const r: u32 = this.d[0] & (((<u32>1) << pow2Bit) - <u32>1);
            return [q, BigInt.fromU32(r)];
        }
        // divide
        const q = BigInt.getEmptyResultContainer(this.n, this.isNeg, this.n);
        let r: u64 = 0;
        let val: u32;
        for (let i = this.n - 1; i >= 0; i--) {
            r = (r << BigInt.p) | (<u64>this.d[i]);
            if (r >= b) {
                val = <u32>(r / b);
                r -= <u64>val * <u64>b;
            } else {
                val = 0;
            }
            q.d[i] = val;
        }
        q.trimLeadingZeros();
        return [q, BigInt.fromU32(<u32>r)];
    }

    // divides and rounds to nearest integer
    roundedDivInt(b: u32): BigInt {
        if (b == 0) throw new Error('Divide by zero');
        if (this.isZero()) {
            return BigInt.fromU16(0);
        }
        const r: BigInt = BigInt.fromU32(b >> 1);
        if (this.isNeg) {
            r.isNeg = true;
        }
        return this.add(r).divInt(b);
    }

    @operator.prefix('~')
    not(): BigInt {
        if (this.isNeg) {
            // ~(-x) == ~(~(x-1)) == x-1
            return this._subOne(false);
        }
        // ~x == -x-1 == -(x+1)
        return this._addOne(true);
    }

    and<T>(other: T): BigInt {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let a: BigInt = this;
        let b: BigInt = BigInt.from(other);
        if (!a.isNeg && !b.isNeg) {
            return BigInt._and(a, b);
        } else if (a.isNeg && b.isNeg) {
            // (-x) & (-y) == ~(x-1) & ~(y-1) == ~((x-1) | (y-1))
            // == -(((x-1) | (y-1)) + 1)
            const a1 = a._subOne(false);
            const b1 = b._subOne(false);
            return BigInt._or(a1, b1)._addOne(true);
        }
        // Assume that 'a' is the positive BigInt
        if (a.isNeg) {
            const temp: BigInt = a;
            a = b;
            b = temp;
        }
        // x & (-y) == x & ~(y-1) == x &~ (y-1)
        const b1 = b._subOne(false);
        return a._andNot(b1);
    }

    or<T>(other: T): BigInt {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let a: BigInt = this;
        let b: BigInt = BigInt.from(other);
        if (!a.isNeg && !b.isNeg) {
            return BigInt._or(a, b);
        } else if (a.isNeg && b.isNeg) {
            // (-x) | (-y) == ~(x-1) | ~(y-1) == ~((x-1) & (y-1))
            // == -(((x-1) & (y-1)) + 1)
            const a1: BigInt = a._subOne(false);
            const b1: BigInt = b._subOne(false);
            return BigInt._and(a1, b1)._addOne(true);
        } else {
            // Assume that 'a' is the positive BigInt
            if (a.isNeg) {
                const temp: BigInt = a;
                a = b;
                b = temp;
            }
            // x | (-y) == x | ~(y-1) == ~((y-1) &~ x) == -(((y-1) ~& x) + 1)
            const b1: BigInt = b._subOne(false);
            return b1._andNot(a)._addOne(true);
        }
    }

    xor<T>(other: T): BigInt {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let a: BigInt = this;
        let b: BigInt = BigInt.from(other);
        if (!a.isNeg && !b.isNeg) {
            return BigInt._xor(a, b);
        } else if (a.isNeg && b.isNeg) {
            // (-x) ^ (-y) == ~(x-1) ^ ~(y-1) == (x-1) ^ (y-1)
            const a1: BigInt = a._subOne(false);
            const b1: BigInt = b._subOne(false);
            return BigInt._xor(a1, b1);
        } else {
            // Assume that 'a' is the positive BigInt
            if (a.isNeg) {
                const temp: BigInt = a;
                a = b;
                b = temp;
            }
            // x ^ (-y) == x ^ ~(y-1) == ~(x ^ (y-1)) == -((x ^ (y-1)) + 1)
            const b1: BigInt = b._subOne(false);
            return BigInt._xor(a, b1)._addOne(true);
        }
    }

    countBits(): i32 {
        if (this.n == 0) return 0;
        // initialize to bits in fully used digits
        let bits: i32 = (this.n - 1) * BigInt.p;
        // count bits used in most significant digit
        let q: u32 = this.d[this.n - 1];
        while (q > 0) {
            ++bits;
            q >>= 1;
        }
        return bits;
    }

    isOdd(): boolean {
        return this.n > 0 && (this.d[0] & 1) == 1;
    }

    isZero(): boolean {
        return this.n == 0;
    }

    private trimLeadingZeros(): void {
        while (this.n > 0 && this.d[this.n - 1] == 0) {
            this.n--;
        }
        if (this.n == 0) {
            this.isNeg = false;
        }
    }

    private resize(max: i32): void {
        const temp: Uint32Array = new Uint32Array(max);
        for (let i = 0; i < this.n; i++) {
            temp[i] = this.d[i];
        }
        this.d = temp;
    }

    private grow(size: i32): void {
        if (this.d.length >= size) return;
        this.resize(size + 2 * BigInt.precision - (size % BigInt.precision));
    }

    // unsigned addition
    private _add(other: BigInt, resultIsNegative: boolean): BigInt {
        // determine which summand is larger
        let min: i32;
        let max: i32;
        let x: BigInt;
        if (this.n > other.n) {
            min = other.n;
            max = this.n;
            x = this;
        } else {
            min = this.n;
            max = other.n;
            x = other;
        }
        // initialize result
        const res: BigInt = BigInt.getEmptyResultContainer(max + 1, resultIsNegative, max);
        // add
        let carry: u32 = 0;
        let i: i32 = 0;
        for (; i < min; i++) {
            res.d[i] = this.d[i] + other.d[i] + carry;
            carry = res.d[i] >> BigInt.p;
            res.d[i] &= BigInt.digitMask;
        }
        if (min != max) {
            for (; i < max; i++) {
                res.d[i] = x.d[i] + carry;
                carry = res.d[i] >> BigInt.p;
                res.d[i] &= BigInt.digitMask;
            }
        }
        if (carry > 0) {
            res.d[max] = carry;
            res.n++;
        }
        return res;
    }

    // unsigned subtraction
    private _sub(other: BigInt, resultIsNegative: boolean): BigInt {
        const min: i32 = other.n;
        const max: i32 = this.n;
        // initialize result
        const res: BigInt = BigInt.getEmptyResultContainer(max, resultIsNegative, max);
        // subtract
        let carry: u32 = 0;
        let i: i32 = 0;
        for (; i < min; i++) {
            res.d[i] = this.d[i] - other.d[i] - carry;
            carry = res.d[i] >> (BigInt.actualBits - 1);
            res.d[i] &= BigInt.digitMask;
        }
        if (min < max) {
            for (; i < max; i++) {
                res.d[i] = this.d[i] - carry;
                carry = res.d[i] >> (BigInt.actualBits - 1);
                res.d[i] &= BigInt.digitMask;
            }
        }
        // trim and return
        res.trimLeadingZeros();
        return res;
    }

    // unsigned addition of 1
    private _addOne(resultIsNegative: boolean): BigInt {
        const res: BigInt = BigInt.getEmptyResultContainer(this.n + 1, resultIsNegative, this.n);
        let carry = 1;
        for (let i = 0; i < this.n; i++) {
            res.d[i] = this.d[i] + carry;
            carry = res.d[i] >> BigInt.p;
            res.d[i] &= BigInt.digitMask;
        }
        if (carry > 0) {
            res.d[this.n] = carry;
            res.n++;
        }
        res.trimLeadingZeros();
        return res;
    }

    // unsigned subtraction of 1
    private _subOne(resultIsNegative: boolean): BigInt {
        const res: BigInt = BigInt.getEmptyResultContainer(this.n, resultIsNegative, this.n);
        let carry = 1;
        for (let i = 0; i < this.n; i++) {
            res.d[i] = this.d[i] - carry;
            carry = res.d[i] >> (BigInt.actualBits - 1);
            res.d[i] &= BigInt.digitMask;
        }
        res.trimLeadingZeros();
        return res;
    }

    // *** mutates BigInt ***
    private mulBasisPow(b: i32): void {
        if (b <= 0) return;
        this.grow(this.n + b);
        this.n += b;
        let i: i32 = this.n - 1;
        let j: i32 = this.n - 1 - b;
        for (; i >= b; i--, j--) {
            this.d[i] = this.d[j];
        }
        for (; i >= 0; i--) {
            this.d[i] = 0;
        }
    }

    // *** mutates BigInt ***
    private divBasisPow(b: i32): void {
        if (b <= 0) return;
        // integer division with denominator > numerator = 0
        if (this.n <= b) {
            this.n = 0;
            this.trimLeadingZeros();
            return;
        }
        // division
        let i: i32 = 0;
        let j: i32 = b;
        for (; i < this.n - b; i++, j++) {
            this.d[i] = this.d[j];
        }
        for (; i < this.n; i++) {
            this.d[i] = 0;
        }
        this.n -= b;
    }

    private leftShiftByAbsolute(k: i32): BigInt {
        return this.mulPowTwo(k >>> 0);
    }

    private rightShiftByAbsolute(k: i32): BigInt {
        const shift: i32 = k >>> 0;
        // shift by max if result would equal 0
        if (this.n - shift / BigInt.p <= 0) {
            return BigInt.rightShiftByMaximum(this.isNeg);
        }
        // arithmetic shift
        const res: BigInt = this.divPowTwo(shift);
        // for negative numbers, round down if a bit would be shifted out
        // Since the result is negative, rounding down means adding one to its absolute value. This cannot overflow.
        if (this.rightShiftMustRoundDown(shift)) {
            return res._addOne(true);
        }
        return res;
    }

    // result large enough up front, it avoids having to do grow it later.
    private rightShiftMustRoundDown(k: i32): boolean {
        if (this.isNeg) {
            const digitShift: i32 = k / BigInt.p;
            const remK: i32 = k % BigInt.p;
            const mask: u32 = <u32>((1 << remK) - 1);
            if ((this.d[digitShift] & mask) != 0) {
                return true;
            } else {
                for (let i = 0; i < digitShift; i++) {
                    if (this.d[i] != 0) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    // unsigned multiplication that returns at most maxDigits
    private _mulPartial(other: BigInt, maxDigits: i32): BigInt {
        // const min: i32 = this.n <= other.n ? this.n : other.n;
        // optimization -> use Comba multiplication if possible
        // if (maxDigits < BigInt.maxComba && min < BigInt.maxComba) {
        //   return this._mulComba(other, maxDigits);
        // }
        const res = BigInt.getEmptyResultContainer(maxDigits, false, maxDigits);
        // multiply using standard O(N^2) method taught in schools
        for (let i = 0; i < this.n; i++) {
            let r: u32 = 0;
            const digsSubI: i32 = maxDigits - i;
            const limitedN: i32 = other.n < digsSubI ? other.n : digsSubI;
            for (let j = 0; j < limitedN; j++) {
                const rr: u64 = <u64>res.d[i + j] + <u64>this.d[i] * other.d[j] + r;
                res.d[i + j] = <u32>(rr & (<u64>BigInt.digitMask));
                r = <u32>(rr >> BigInt.p);
            }
            if (i + limitedN < maxDigits) {
                res.d[i + limitedN] = r;
            }
        }
        res.trimLeadingZeros();
        return res;
    }

    // fast unsigned multiplication using Comba method
    private _mulComba(other: BigInt, maxDigits: i32): BigInt {
        const totalN = this.n + other.n;
        const outerN: i32 = maxDigits < totalN ? maxDigits : totalN; // number of output digits to produce
        const res = BigInt.getEmptyResultContainer(outerN, false, outerN);
        let w: u64 = 0;
        // multiply, ignoring carries
        for (let i = 0; i < outerN; i++) {
            // calculate tY and tX, offsets into the multiplicands
            const maxJ: i32 = other.n - 1;
            const tY: i32 = maxJ < i ? maxJ : i;
            const tX: i32 = i - tY;
            // calculate innerN, the number of times inner loop will iterate
            const distFromEnd: i32 = this.n - tX;
            const currentN: i32 = tY + 1;
            const innerN: i32 = distFromEnd < currentN ? distFromEnd : currentN;
            for (let j = 0; j < innerN; j++) {
                w += <u64>this.d[tX + j] * other.d[tY - j];
            }
            res.d[i] = (<u32>w) & BigInt.digitMask;
            w = w >> BigInt.p;
        }
        res.trimLeadingZeros();
        return res;
    }

    private _baseSquare(): BigInt {
        const size: i32 = this.n + this.n + 1;
        const res = BigInt.getEmptyResultContainer(size, false, size);
        for (let i = 0; i < size; i++) {
            let j: i32;
            // first calculate the digit at 2*i and the double precision result
            let r: u64 = <u64>this.d[i] * this.d[i] + res.d[i + i];
            // store lower part in result
            res.d[i + i] = <u32>(r & BigInt.digitMask);
            // get the carry
            let u: u32 = <u32>(r >> BigInt.p);
            for (j = i + 1; j < size; j++) {
                // first calculate the product
                r = <u64>this.d[i] * this.d[j];
                // now calculate the double precision result
                r = <u64>res.d[i + j] + r + r + u;
                // store lower part
                res.d[i + j] = <u32>(r & BigInt.digitMask);
                // get carry
                u = <u32>(r >> BigInt.p);
            }
            // propagate upwards
            while (u != 0) {
                r = <u64>res.d[i + j] + u;
                res.d[i + j] = <u32>(r & BigInt.digitMask);
                u = <u32>(r >> BigInt.p);
                ++j;
            }
        }
        res.trimLeadingZeros();
        return res;
    }

    private _squareComba(): BigInt {
        const size: i32 = this.n + this.n;
        const res = BigInt.getEmptyResultContainer(size, false, size);

        let u: u64 = 0;
        for (let i = 0; i < size; i++) {
            /* clear accumulator */
            let accum: u64 = 0;
            /* get offsets into the two BigInts */
            const nSub1: i32 = this.n - 1;
            const y: i32 = nSub1 < i ? nSub1 : i; // min
            const x: i32 = i - y;
            /* this is the number of times the loop will iterate, essentially
               while (x++ < this.n && y-- >= 0) { ... }
             */
            const nSubX: i32 = this.n - x;
            const yAdd1: i32 = y + 1;
            let j: i32 = nSubX < yAdd1 ? nSubX : yAdd1; // min
            /* now for squaring x can never equal y
             * we halve the distance since they approach at a rate of 2*
             * and we have to round because odd cases need to be executed
             */
            const shiftedDiff: i32 = (y - x + 1) >> 1;
            j = j < shiftedDiff ? j : shiftedDiff;
            /* execute loop */
            for (let k = 0; k < j; k++) {
                accum += <u64>this.d[x + k] * this.d[y - k];
            }
            /* double the inner product and add carry */
            accum = accum + accum + u;
            /* even columns have the square term in them */
            if (((<u32>i) & 1) == 0) {
                accum += <u64>this.d[i >> 1] * this.d[i >> 1];
            }
            /* store it */
            res.d[i] = (<u32>accum) & BigInt.digitMask;
            /* make next carry */
            u = accum >> BigInt.p;
        }
        res.trimLeadingZeros();
        return res;
    }

    private _div(other: BigInt): BigInt {
        if (other.eq(BigInt.fromU16(0))) {
            throw new Error('Divide by zero');
        }
        const cmp: i32 = this.magCompareTo(other);
        if (cmp < 0) {
            return BigInt.fromU16(0);
        } else if (cmp == 0) {
            const q = BigInt.fromU16(1);
            q.isNeg = this.isNeg != other.isNeg;
            return q;
        }
        const res: BigInt[] = this._divCore(other);
        const q: BigInt = res[0];
        q.isNeg = this.isNeg != other.isNeg;
        q.trimLeadingZeros();
        return q;
    }

    private _divRemainder(other: BigInt): BigInt {
        if (other.eq(BigInt.fromU16(0))) {
            throw new Error('Divide zero error');
        }
        const cmp: i32 = this.magCompareTo(other);
        if (cmp < 0) {
            return this.copy();
        } else if (cmp == 0) {
            return BigInt.fromU16(0);
        }
        const res: BigInt[] = this._divCore(other);
        const r: BigInt = res[1];
        r.isNeg = this.isNeg;
        r.trimLeadingZeros();
        return r;
    }

    // returns [quotient, remainder]
    private _divMod(other: BigInt): BigInt[] {
        if (other.eq(BigInt.fromU16(0))) {
            throw new Error('Divide by zero');
        }
        const cmp: i32 = this.magCompareTo(other);
        if (cmp < 0) {
            return [BigInt.fromU16(0), this.copy()];
        } else if (cmp == 0) {
            const q = BigInt.fromU16(1);
            q.isNeg = this.isNeg != other.isNeg;
            return [q, BigInt.fromU16(0)];
        }
        const res: BigInt[] = this._divCore(other);
        const q: BigInt = res[0];
        const r: BigInt = res[1];
        r.isNeg = this.isNeg;
        r.trimLeadingZeros();
        q.isNeg = this.isNeg != other.isNeg;
        q.trimLeadingZeros();
        return [q, r];
    }

    private _divCore(other: BigInt): BigInt[] {
        let q: BigInt = BigInt.fromU16(0);
        let tempQ = BigInt.fromU16(1);
        let n: i32 = this.countBits() - other.countBits();
        let tempA = this.abs();
        let tempB = other.abs();
        tempB = tempB.mulPowTwo(n);
        tempQ = tempQ.mulPowTwo(n);
        for (; n >= 0; n--) {
            if (tempB.magCompareTo(tempA) <= 0) {
                tempA = tempA.sub(tempB);
                q = q.add(tempQ);
            }
            tempB = tempB.div2();
            tempQ = tempQ.div2();
        }
        return [q, tempA];
    }

    // MUTATES
    private inplaceMulInt(b: u32): BigInt {
        if (b > 268435456) {
            return this.mul(BigInt.fromU32(b));
        }
        this.grow(this.n + 1);
        let r: u32 = 0;
        for (let i = 0; i < this.n; i++) {
            const rr: u64 = <u64>this.d[i] * <u64>b + <u64>r;
            this.d[i] = <u32>(rr & (<u64>BigInt.digitMask));
            r = <u32>(rr >> BigInt.p);
        }
        if (r != 0) {
            this.d[this.n++] = r;
        }
        return this;
    }

    // MUTATES
    private inplaceDivInt(b: u32): BigInt {
        if (b == 0) throw new Error('Divide by zero');
        // try optimizations
        if (b == 1 || this.n == 0) return this;
        const pow2Bit: i32 = BigInt.isPow2(b);
        if (pow2Bit != 0) return this.divPowTwo(pow2Bit);
        // divide
        let r: u64 = 0;
        let val: u32;
        for (let i = this.n - 1; i >= 0; i--) {
            r = (r << BigInt.p) | (<u64>this.d[i]);
            if (r >= b) {
                val = <u32>(r / b);
                r -= <u64>val * <u64>b;
            } else {
                val = 0;
            }
            this.d[i] = val;
        }
        this.trimLeadingZeros();
        return this;
    }

    // unsigned bitwise AND NOT (i.e. a & ~b)
    private _andNot(other: BigInt): BigInt {
        const numPairs: i32 = this.n < other.n ? this.n : other.n;
        const res: BigInt = BigInt.getEmptyResultContainer(this.n, false, this.n);

        let i = 0;
        for (; i < numPairs; i++) {
            res.d[i] = this.d[i] & ~other.d[i];
        }
        for (; i < this.n; i++) {
            res.d[i] = this.d[i];
        }
        return res;
    }
}
