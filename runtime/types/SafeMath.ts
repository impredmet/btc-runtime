import { BigInt } from '../libraries/BigInt';

export class SafeMath {
    public static ZERO: BigInt = BigInt.ZERO;

    public static add(a: BigInt, b: BigInt): BigInt {
        const c: BigInt = BigInt.add(a, b);
        if (c < a) {
            throw new Error('SafeMath: addition overflow');
        }
        return c;
    }

    public static sub(a: BigInt, b: BigInt): BigInt {
        if (a < b) {
            throw new Error('SafeMath: subtraction overflow');
        }

        return BigInt.sub(a, b);
    }

    // Computes (a * b) % modulus with full precision
    public static mulmod(a: BigInt, b: BigInt, modulus: BigInt): BigInt {
        if (BigInt.eq(modulus, BigInt.ZERO)) throw new Error('SafeMath: modulo by zero');

        const mul = SafeMath.mul(a, b);
        return SafeMath.mod(mul, modulus);
    }

    @inline
    @unsafe
    @operator('%')
    public static mod(a: BigInt, b: BigInt): BigInt {
        if (BigInt.eq(b, BigInt.ZERO)) {
            throw new Error('SafeMath: modulo by zero');
        }

        return a.mod(b);

        /*let result = a.copy();
        while (BigInt.ge(result, b)) {
            result = BigInt.sub(result, b);
        }

        return result;*/
    }

    public static mul(a: BigInt, b: BigInt): BigInt {
        if (a === SafeMath.ZERO || b === SafeMath.ZERO) {
            return SafeMath.ZERO;
        }

        const c: BigInt = BigInt.mul(a, b);
        /*const d: BigInt = BigInt.div(c, a); //SafeMath.div(c, a);

        if (BigInt.ne(d, b)) {
            throw new Error('SafeMath: multiplication overflow');
        }*/

        if (c.gt(BigInt.MAX_SAFE_U256)) {
            throw new Error('SafeMath: multiplication overflow');
        }

        return c;
    }

    @inline
    @unsafe
    @operator('/')
    public static div(a: BigInt, b: BigInt): BigInt {
        /*if (b.isZero()) {
            throw new Error('Division by zero');
        }

        if (a.isZero()) {
            return BigInt.ZERO;
        }

        if (BigInt.lt(a, b)) {
            return BigInt.ZERO;
        }

        if (BigInt.eq(a, b)) {
            return BigInt.ONE;
        }*/

        return a.div(b);

        /*let n = a.clone();
        let d = b.clone();
        let result = new BigInt();

        let shift = BigInt.clz(d) - BigInt.clz(n);
        d = SafeMath.shl(d, shift); // align d with n by shifting left

        for (let i = shift; i >= 0; i--) {
            if (BigInt.ge(n, d)) {
                n = BigInt.sub(n, d);
                result = BigInt.or(result, SafeMath.shl(BigInt.ONE, i));
            }
            d = BigInt.shr(d, 1); // restore d to original by shifting right
        }

        return result;*/
    }

    public static min(a: BigInt, b: BigInt): BigInt {
        return BigInt.lt(a, b) ? a : b;
    }

    public static max(a: BigInt, b: BigInt): BigInt {
        return BigInt.gt(a, b) ? a : b;
    }

    @inline
    @unsafe
    public static sqrt(y: BigInt): BigInt {
        /*if (BigInt.gt(y, BigInt.fromU32(3))) {
            let z = y;

            let u246_2 = BigInt.fromU32(2);

            let d = SafeMath.div(y, u246_2);
            let x = SafeMath.add(d, BigInt.ONE);

            while (BigInt.lt(x, z)) {
                z = x;

                let u = SafeMath.div(y, x);
                let y2 = BigInt.add(u, x);

                x = SafeMath.div(y2, u246_2);
            }

            return z;
        } else if (!BigInt.eq(y, BigInt.ZERO)) {
            return BigInt.ONE;
        } else {
            return BigInt.ZERO;
        }*/

        return y.sqrt();
    }

    @inline
    @unsafe
    public static shl(value: BigInt, shift: i32): BigInt {
        /*if (shift == 0) {
            return value.clone();
        }

        let totalBits = 256;
        let bitsPerSegment = 64;

        // Normalize shift to be within 0-255 range
        shift &= 255;

        if (shift >= totalBits) {
            return new BigInt(); // Shift size larger than width results in zero
        }

        // Determine how many full 64-bit segments we are shifting
        let segmentShift = (shift / bitsPerSegment) | 0;
        let bitShift = shift % bitsPerSegment;

        let segments = [value.lo1, value.lo2, value.hi1, value.hi2];

        let result = new Array<u64>(4).fill(0);

        for (let i = 0; i < segments.length; i++) {
            if (i + segmentShift < segments.length) {
                result[i + segmentShift] |= segments[i] << bitShift;
            }
            if (bitShift != 0 && i + segmentShift + 1 < segments.length) {
                result[i + segmentShift + 1] |= segments[i] >>> (bitsPerSegment - bitShift);
            }
        }

        return new BigInt(result[0], result[1], result[2], result[3]);*/

        return value.lsh(shift);
    }

    public static and(a: BigInt, b: BigInt): BigInt {
        return a.and(b);
    }

    public static or(a: BigInt, b: BigInt): BigInt {
        return a.or(b);
    }

    public static xor(a: BigInt, b: BigInt): BigInt {
        return a.xor(b);
    }

    public static shr(a: BigInt, b: u32): BigInt {
        return a.shr(b);
    }

    /**
     * Increment a BigInt value by 1
     * @param value The value to increment
     * @returns The incremented value
     */
    /*@inline
    static inc(value: BigInt): BigInt {
        return value.
    }*/
}
