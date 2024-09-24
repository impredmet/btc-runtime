export class u512 {
    public lo1: u64;
    public lo2: u64;
    public hi1: u64;
    public hi2: u64;
    public hi3: u64;
    public hi4: u64;
    public hi5: u64;
    public hi6: u64;

    constructor(
        lo1: u64 = 0,
        lo2: u64 = 0,
        hi1: u64 = 0,
        hi2: u64 = 0,
        hi3: u64 = 0,
        hi4: u64 = 0,
        hi5: u64 = 0,
        hi6: u64 = 0,
    ) {
        this.lo1 = lo1;
        this.lo2 = lo2;
        this.hi1 = hi1;
        this.hi2 = hi2;
        this.hi3 = hi3;
        this.hi4 = hi4;
        this.hi5 = hi5;
        this.hi6 = hi6;
    }
}
