import { safeU256 } from '../libraries/u256';

export class SafeMath {
    public static ZERO: safeU256 = safeU256.Zero;

    public static add(a: safeU256, b: safeU256): safeU256 {
        const c: safeU256 = b.add(a);
        if (c < a) {
            throw new Error('SafeMath: addition overflow');
        }
        return c;
    }

    public static sub(a: safeU256, b: safeU256): safeU256 {
        if (a < b) {
            throw new Error('SafeMath: subtraction overflow');
        }

        return a.sub(b);
    }

    // Computes (a * b) % modulus with full precision
    public static mulmod(a: safeU256, b: safeU256, modulus: safeU256): safeU256 {
        if (safeU256.eq(modulus, safeU256.Zero)) throw new Error('SafeMath: modulo by zero');

        const mul = SafeMath.mul(a, b);
        return SafeMath.mod(mul, modulus);
    }

    @inline
    @unsafe
    @operator('%')
    public static mod(a: safeU256, b: safeU256): safeU256 {
        if (safeU256.eq(b, safeU256.Zero)) {
            throw new Error('SafeMath: modulo by zero');
        }

        const result = a.clone();
        while (safeU256.ge(result, b)) {
            result.sub(b);
            //result = safeU256.sub(result, b);
        }

        return result;
    }

    public static mul(a: safeU256, b: safeU256): safeU256 {
        if (a == SafeMath.ZERO || b == SafeMath.ZERO) {
            return SafeMath.ZERO;
        }

        const bClone = b.clone();
        const c: safeU256 = bClone.mul(a);
        const d: safeU256 = SafeMath.div(c, a);

        if (safeU256.ne(d, b)) {
            throw new Error('SafeMath: multiplication overflow');
        }

        return c;
    }

    @inline
    @unsafe
    @operator('/')
    public static div(a: safeU256, b: safeU256): safeU256 {
        if (b.isZero()) {
            throw new Error('Division by zero');
        }

        if (a.isZero()) {
            return new safeU256();
        }

        if (safeU256.lt(a, b)) {
            return new safeU256(); // Return 0 if a < b
        }

        if (safeU256.eq(a, b)) {
            return new safeU256(1); // Return 1 if a == b
        }

        const result = new safeU256();
        const n = a.clone();

        let d = b.clone();

        const shift = safeU256.clz(d) - safeU256.clz(n);
        d = SafeMath.shl(d, shift); // align d with n by shifting left

        for (let i = shift; i >= 0; i--) {
            if (safeU256.ge(n, d)) {
                n.sub(d);

                const shiftR = SafeMath.shl(safeU256.One, i);
                result.or(shiftR);
            }
            d.shr(1); // restore d to original by shifting right
        }

        return result;
    }

    public static min(a: safeU256, b: safeU256): safeU256 {
        return safeU256.lt(a, b) ? a : b;
    }

    public static max(a: safeU256, b: safeU256): safeU256 {
        return safeU256.gt(a, b) ? a : b;
    }

    @inline
    @unsafe
    public static sqrt(y: safeU256): safeU256 {
        if (safeU256.gt(y, safeU256.fromU32(3))) {
            let z = y;

            const u246_2 = safeU256.fromU32(2);

            const d = SafeMath.div(y, u246_2);
            let x = SafeMath.add(d, safeU256.One);

            while (safeU256.lt(x, z)) {
                z = x;

                const u = SafeMath.div(y, x);
                u.add(x);

                x = SafeMath.div(u, u246_2);
            }

            return z;
        } else if (!safeU256.eq(y, safeU256.Zero)) {
            return safeU256.One;
        } else {
            return safeU256.Zero;
        }
    }

    @inline
    @unsafe
    public static shl(value: safeU256, shift: i32): safeU256 {
        /*if (shift == 0) {
            return value.clone();
        }

        let totalBits = 256;
        let bitsPerSegment = 64;

        // Normalize shift to be within 0-255 range
        shift &= 255;

        if (shift >= totalBits) {
            return new safeU256(); // Shift size larger than width results in zero
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

        return new safeU256(result[0], result[1], result[2], result[3]);*/

        return value.shl(shift);
    }

    public static and(a: safeU256, b: safeU256): safeU256 {
        return a.and(b); //safeU256.and(a, b);
    }

    public static or(a: safeU256, b: safeU256): safeU256 {
        return a.or(b); //safeU256.or(a, b);
    }

    public static xor(a: safeU256, b: safeU256): safeU256 {
        return a.xor(b); //safeU256.xor(a, b);
    }

    public static shr(a: safeU256, b: u32): safeU256 {
        return a.shr(b); //safeU256.shr(a, b);
    }

    /**
     * Increment a safeU256 value by 1
     * @param value The value to increment
     * @returns The incremented value
     */
    @inline
    static inc(value: safeU256): safeU256 {
        return value.preInc();
    }
}
