import { u128, u256 } from 'as-bignum/assembly';
import { u512 } from './u512';
import { u256 as U256 } from 'as-bignum/assembly/integer/u256';
import { u128 as U128 } from 'as-bignum/assembly/integer/u128';

@inline
function fullMul64(a: u64, b: u64): u64[] {
    // Split the inputs into high and low 32-bit parts
    let a_lo = a & 0xFFFFFFFF;
    let a_hi = a >> 32;
    let b_lo = b & 0xFFFFFFFF;
    let b_hi = b >> 32;

    // Compute partial products
    let p0 = a_lo * b_lo; // Low 32 bits * low 32 bits
    let p1 = a_lo * b_hi; // Low 32 bits * high 32 bits
    let p2 = a_hi * b_lo; // High 32 bits * low 32 bits
    let p3 = a_hi * b_hi; // High 32 bits * high 32 bits

    // Combine partial products
    let carry = ((p0 >> 32) + (p1 & 0xFFFFFFFF) + (p2 & 0xFFFFFFFF)) >> 32;
    let low = p0 + ((p1 & 0xFFFFFFFF) << 32) + ((p2 & 0xFFFFFFFF) << 32);
    let high = p3 + (p1 >> 32) + (p2 >> 32) + carry;

    return [low, high];
}

export class safeU256 extends u256 {
    public overflow: bool = false;

    @inline
    static get Zero(): safeU256 {
        return new safeU256(0, 0, 0, 0);
    }

    @inline
    static get One(): safeU256 {
        return new safeU256(1, 0, 0, 0);
    }

    @inline
    static get Max(): safeU256 {
        return new safeU256(-1, -1, -1, -1);
    }

    @inline
    private static mulInternal(a: safeU256, b: safeU256): u64[] {
        // Save original values of this
        const a0 = a.lo1;
        const a1 = a.lo2;
        const a2 = a.hi1;
        const a3 = a.hi2;

        const b0 = b.lo1;
        const b1 = b.lo2;
        const b2 = b.hi1;
        const b3 = b.hi2;

        // Initialize result limbs
        let r0: u64 = 0;
        let r1: u64 = 0;
        let r2: u64 = 0;
        let r3: u64 = 0;
        let r4: u64 = 0;
        let r5: u64 = 0;
        let r6: u64 = 0;
        let r7: u64 = 0;

        // Temporary variables
        let lo: u64, hi: u64;
        let carry: u64;

        // Compute partial products and accumulate

        // Compute r0 = a0 * b0
        // @ts-ignore
        [lo, hi] = fullMul64(a0, b0);
        r0 = lo;
        carry = hi;

        // Compute r1 = a0 * b1 + a1 * b0 + carry
        // @ts-ignore
        [lo, hi] = fullMul64(a0, b1);
        r1 = lo + carry;
        carry = hi + u64(r1 < lo);
        // @ts-ignore
        [lo, hi] = fullMul64(a1, b0);
        r1 += lo;
        carry += hi + u64(r1 < lo);

        // Compute r2 = a0 * b2 + a1 * b1 + a2 * b0 + carry
        // @ts-ignore
        [lo, hi] = fullMul64(a0, b2);
        r2 = lo + carry;
        carry = hi + u64(r2 < lo);
        // @ts-ignore
        [lo, hi] = fullMul64(a1, b1);
        r2 += lo;
        carry += hi + u64(r2 < lo);
        // @ts-ignore
        [lo, hi] = fullMul64(a2, b0);
        r2 += lo;
        carry += hi + u64(r2 < lo);

        // Compute r3 = a0 * b3 + a1 * b2 + a2 * b1 + a3 * b0 + carry
        // @ts-ignore
        [lo, hi] = fullMul64(a0, b3);
        r3 = lo + carry;
        carry = hi + u64(r3 < lo);
        // @ts-ignore
        [lo, hi] = fullMul64(a1, b2);
        r3 += lo;
        carry += hi + u64(r3 < lo);
        // @ts-ignore
        [lo, hi] = fullMul64(a2, b1);
        r3 += lo;
        carry += hi + u64(r3 < lo);
        // @ts-ignore
        [lo, hi] = fullMul64(a3, b0);
        r3 += lo;
        carry += hi + u64(r3 < lo);

        // Compute r4 = a1 * b3 + a2 * b2 + a3 * b1 + carry
        // @ts-ignore
        [lo, hi] = fullMul64(a1, b3);
        r4 = lo + carry;
        carry = hi + u64(r4 < lo);
        // @ts-ignore
        [lo, hi] = fullMul64(a2, b2);
        r4 += lo;
        carry += hi + u64(r4 < lo);
        // @ts-ignore
        [lo, hi] = fullMul64(a3, b1);
        r4 += lo;
        carry += hi + u64(r4 < lo);

        // Compute r5 = a2 * b3 + a3 * b2 + carry
        // @ts-ignore
        [lo, hi] = fullMul64(a2, b3);
        r5 = lo + carry;
        carry = hi + u64(r5 < lo);
        // @ts-ignore
        [lo, hi] = fullMul64(a3, b2);
        r5 += lo;
        carry += hi + u64(r5 < lo);

        // Compute r6 = a3 * b3 + carry
        // @ts-ignore
        [lo, hi] = fullMul64(a3, b3);
        r6 = lo + carry;
        carry = hi + u64(r6 < lo);

        // r7 is the final carry
        r7 = carry;

        return [r0, r1, r2, r3, r4, r5, r6, r7];
    }

    @inline
    @operator('+')
    add(b: safeU256): this {
        const lo1a = this.lo1;
        this.lo1 = lo1a + b.lo1;
        let cy: u64 = u64(this.lo1 < lo1a);

        const lo2a = this.lo2;
        const lo2b = b.lo2;
        this.lo2 = lo2a + lo2b + cy;
        cy = ((lo2a & lo2b) | ((lo2a | lo2b) & ~this.lo2)) >> 63;

        const hi1a = this.hi1;
        const hi1b = b.hi1;
        this.hi1 = hi1a + hi1b + cy;
        cy = ((hi1a & hi1b) | ((hi1a | hi1b) & ~this.hi1)) >> 63;

        this.hi2 = this.hi2 + b.hi2 + cy;

        return this;
    }

    @inline
    @operator('-')
    sub(b: safeU256): this {
        const lo1a = this.lo1;
        const lo1b = b.lo1;
        this.lo1 = lo1a - lo1b;
        let cy: u64 = u64(lo1a < lo1b);

        const lo2a = this.lo2;
        const lo2b = b.lo2;
        this.lo2 = lo2a - lo2b - cy;
        cy = u64(lo2a < lo2b + cy);

        const hi1a = this.hi1;
        const hi1b = b.hi1;
        this.hi1 = hi1a - hi1b - cy;
        cy = u64(hi1a < hi1b + cy);

        this.hi2 = this.hi2 - b.hi2 - cy;

        return this;
    }

    @inline
    static fromU256(value: u256): safeU256 {
        return changetype<safeU256>(U256.fromU256(value));
    }

    @inline
    static fromU128(value: u128): safeU256 {
        return changetype<safeU256>(U256.fromU128(value));
    }

    @inline
    static fromI64(value: i64): safeU256 {
        return changetype<safeU256>(U256.fromI64(value));
    }

    @inline
    static fromU64(value: u64): safeU256 {
        return changetype<safeU256>(U256.fromU64(value));
    }

    @inline
    static fromF64(value: f64): safeU256 {
        return changetype<safeU256>(U256.fromF64(value));
    }

    @inline
    static fromF32(value: f32): safeU256 {
        return changetype<safeU256>(U256.fromF32(value));
    }

    @inline
    static fromI32(value: i32): safeU256 {
        return changetype<safeU256>(U256.fromI32(value));
    }

    @inline
    static fromU32(value: u32): safeU256 {
        return changetype<safeU256>(U256.fromU32(value));
    }

    @inline
    static fromBytes<T>(array: T, bigEndian: bool = false): safeU256 {
        return changetype<safeU256>(U256.fromBytes<T>(array, bigEndian));
    }

    @inline
    static fromBytesLE(array: u8[]): safeU256 {
        return changetype<safeU256>(U256.fromBytesLE(array));
    }

    @inline
    static fromBytesBE(array: u8[]): safeU256 {
        return changetype<safeU256>(U256.fromBytesBE(array));
    }

    @inline
    static fromUint8ArrayLE(array: Uint8Array): safeU256 {
        return changetype<safeU256>(U256.fromUint8ArrayLE(array));
    }

    @inline
    static fromUint8ArrayBE(array: Uint8Array): safeU256 {
        return changetype<safeU256>(U256.fromUint8ArrayBE(array));
    }

    @inline
    static from<T>(value: T): safeU256 {
        if (value instanceof bool)       return safeU256.fromU64(<u64>value);
        else if (value instanceof i8)         return safeU256.fromI64(<i64>value);
        else if (value instanceof u8)         return safeU256.fromU64(<u64>value);
        else if (value instanceof i16)        return safeU256.fromI64(<i64>value);
        else if (value instanceof u16)        return safeU256.fromU64(<u64>value);
        else if (value instanceof i32)        return safeU256.fromI64(<i64>value);
        else if (value instanceof u32)        return safeU256.fromU64(<u64>value);
        else if (value instanceof i64)        return safeU256.fromI64(<i64>value);
        else if (value instanceof u64)        return safeU256.fromU64(<u64>value);
        else if (value instanceof f32)        return safeU256.fromF64(<f64>value);
        else if (value instanceof f64)        return safeU256.fromF64(<f64>value);
        else if (value instanceof u128)       return safeU256.fromU128(<u128>value);
        else if (value instanceof U128)       return safeU256.fromU128(<U128>value);
        else if (value instanceof U256)       return safeU256.fromU256(<U256>value);
        else if (value instanceof u256)       return safeU256.fromU256(<u256>value);
        else if (value instanceof u8[])       return safeU256.fromBytes(<u8[]>value);
        else if (value instanceof Uint8Array) return safeU256.fromBytes(<Uint8Array>value);
        else throw new TypeError("Unsupported generic type");
    }

    @inline
    @operator('*')
    mul(b: safeU256): this {
        // @ts-ignore
        const r: u64[] = safeU256.mulInternal(this, b);

        // Assign the computed values back to this (only lower 256 bits)
        this.lo1 = r[0];
        this.lo2 = r[1];
        this.hi1 = r[2];
        this.hi2 = r[3];

        // Note: r4, r5, r6, and r7 contain bits beyond 256 bits. If you need to detect overflow, you can check if any of these are non-zero.

        // Check for overflow
        this.overflow = r[4] !== 0 || r[5] !== 0 || r[6] !== 0 || r[7] !== 0;

        return this;
    }

    @inline
    mulToU512(b: safeU256): u512 {
        const r: u64[] = safeU256.mulInternal(this, b);

        return new u512(r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7]);
    }

    @inline
    shr(shift: i32): this {
        shift &= 255; // Ensure shift is within 0-255

        if (shift == 0) return this;

        let k = shift >> 6; // Number of whole limbs to shift
        let s = shift & 63; // Remaining bits to shift within limbs

        if (k >= 4) {
            // Shift is larger than or equal to 256 bits
            this.lo1 = 0;
            this.lo2 = 0;
            this.hi1 = 0;
            this.hi2 = 0;
            return this;
        }

        let limbs = [this.lo1, this.lo2, this.hi1, this.hi2];
        limbs = limbs.slice(k); // Drop k limbs
        while (limbs.length < 4) limbs.push(0);

        if (s != 0) {
            for (let i = 0; i < limbs.length - 1; i++) {
                limbs[i] = (limbs[i] >> s) | (limbs[i + 1] << (64 - s));
            }
            limbs[limbs.length - 1] >>= s;
        }

        this.lo1 = limbs[0];
        this.lo2 = limbs[1];
        this.hi1 = limbs[2];
        this.hi2 = limbs[3];

        return this;
    }

    @inline
    shl(shift: i32): this {
        shift &= 255; // Ensure shift is within 0-255

        if (shift == 0) return this;

        let k = shift >> 6; // Number of whole limbs to shift
        let s = shift & 63; // Remaining bits to shift within limbs

        if (k >= 4) {
            // Shift is larger than or equal to 256 bits
            this.lo1 = 0;
            this.lo2 = 0;
            this.hi1 = 0;
            this.hi2 = 0;
            return this;
        }

        let limbs = [this.hi2, this.hi1, this.lo2, this.lo1];
        limbs = limbs.slice(k); // Drop k limbs
        while (limbs.length < 4) limbs.push(0);

        if (s != 0) {
            for (let i = limbs.length - 1; i > 0; i--) {
                limbs[i] = (limbs[i] << s) | (limbs[i - 1] >> (64 - s));
            }
            limbs[0] <<= s;
        }

        this.hi2 = limbs[0];
        this.hi1 = limbs[1];
        this.lo2 = limbs[2];
        this.lo1 = limbs[3];

        return this;
    }

    @inline
    override clone(): safeU256 {
        return new safeU256(this.lo1, this.lo2, this.hi1, this.hi2);
    }

    @inline
    @operator('|')
    or(b: safeU256): this {
        this.lo1 |= b.lo1;
        this.lo2 |= b.lo2;
        this.hi1 |= b.hi1;
        this.hi2 |= b.hi2;
        return this;
    }

    @inline
    @operator('&')
    and(b: safeU256): this {
        this.lo1 &= b.lo1;
        this.lo2 &= b.lo2;
        this.hi1 &= b.hi1;
        this.hi2 &= b.hi2;
        return this;
    }

    @inline
    @operator('^')
    xor(b: safeU256): this {
        this.lo1 ^= b.lo1;
        this.lo2 ^= b.lo2;
        this.hi1 ^= b.hi1;
        this.hi2 ^= b.hi2;
        return this;
    }
}
