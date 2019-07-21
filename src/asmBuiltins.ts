
export const c64 = `
!filescope c64
!macro basic_start(addr) {
* = $801
    !byte $0c, $08, $00, $00, $9e
    !for d in [10000, 1000, 100, 10, 1] {
        !if (addr >= d) {
            !byte $30 + (addr/d)%10
        }
    }
    !byte 0, 0, 0
}
`;
