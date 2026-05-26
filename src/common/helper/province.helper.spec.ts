import { ProvinceHelper } from './province.helper'

describe('ProvinceHelper', () => {
    let helper: ProvinceHelper

    beforeEach(() => {
        helper = new ProvinceHelper()
    })

    describe('sanitizeProvinceName', () => {
        it('strips "Thành phố" prefix and lowercases', () => {
            expect(helper.sanitizeProvinceName('Thành phố Hồ Chí Minh')).toBe('hồ chí minh')
        })

        it('strips "Tỉnh" prefix and lowercases', () => {
            expect(helper.sanitizeProvinceName('Tỉnh Bắc Ninh')).toBe('bắc ninh')
        })

        it('trims surrounding whitespace after stripping prefix', () => {
            expect(helper.sanitizeProvinceName('  Hà Nội  ')).toBe('hà nội')
        })

        it('lowercases a plain province name without prefix', () => {
            expect(helper.sanitizeProvinceName('Hải Phòng')).toBe('hải phòng')
        })

        it('returns empty string for empty input', () => {
            expect(helper.sanitizeProvinceName('')).toBe('')
        })
    })

    describe('getRegion', () => {
        it('returns RED_RIVER_DELTA for Hà Nội', () => {
            expect(helper.getRegion('Hà Nội')).toBe('RED_RIVER_DELTA')
        })

        it('returns SOUTH_EAST for Hồ Chí Minh', () => {
            expect(helper.getRegion('Hồ Chí Minh')).toBe('SOUTH_EAST')
        })

        it('returns NORTH_EAST for Quảng Ninh', () => {
            expect(helper.getRegion('Quảng Ninh')).toBe('NORTH_EAST')
        })

        it('returns MEKONG_DELTA for Cần Thơ', () => {
            expect(helper.getRegion('Cần Thơ')).toBe('MEKONG_DELTA')
        })

        it('returns null for an unknown province', () => {
            expect(helper.getRegion('Unknown Province')).toBeNull()
        })
    })

    describe('calculateProvinceProximity', () => {
        it('returns 1.0 for the same province', () => {
            expect(helper.calculateProvinceProximity('Hà Nội', 'Hà Nội')).toBe(1.0)
        })

        it('returns 0.2 for two provinces in the same region', () => {
            expect(helper.calculateProvinceProximity('Hà Nội', 'Bắc Ninh')).toBe(0.2)
        })

        it('returns 0.0 for provinces in different regions', () => {
            expect(helper.calculateProvinceProximity('Hà Nội', 'Hồ Chí Minh')).toBe(0.0)
        })

        it('returns 0.0 when either province is an empty string', () => {
            expect(helper.calculateProvinceProximity('', 'Hà Nội')).toBe(0.0)
        })

        it('returns 0.2 for two provinces in SOUTH_EAST region', () => {
            expect(helper.calculateProvinceProximity('Hồ Chí Minh', 'Đồng Nai')).toBe(0.2)
        })
    })
})
