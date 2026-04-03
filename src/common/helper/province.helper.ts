import { Injectable } from '@nestjs/common'

@Injectable()
export class ProvinceHelper {
  private readonly PROVINCE_REGIONS: Record<string, string[]> = {
    RED_RIVER_DELTA: [
      'Hà Nội',
      'Bắc Ninh',
      'Hưng Yên',
      'Hải Phòng',
      'Ninh Bình',
    ],
    NORTH_EAST: [
      'Cao Bằng',
      'Tuyên Quang',
      'Thái Nguyên',
      'Lạng Sơn',
      'Quảng Ninh',
      'Phú Thọ',
    ],
    NORTH_WEST: [
      'Điện Biên',
      'Lai Châu',
      'Sơn La',
      'Lào Cai',
    ],
    NORTH_CENTRAL: [
      'Thanh Hóa',
      'Nghệ An',
      'Hà Tĩnh',
      'Quảng Trị',
      'Huế',
    ],
    SOUTH_CENTRAL_COAST: [
      'Đà Nẵng',
      'Quảng Ngãi',
      'Khánh Hòa',
    ],
    CENTRAL_HIGHLANDS: [
      'Gia Lai',
      'Đắk Lắk',
      'Lâm Đồng',
    ],
    SOUTH_EAST: [
      'Hồ Chí Minh',
      'Đồng Nai',
      'Tây Ninh',
    ],
    MEKONG_DELTA: [
      'Đồng Tháp',
      'Vĩnh Long',
      'An Giang',
      'Cần Thơ',
      'Cà Mau',
    ],
  }

  /**
   * Làm sạch tên tỉnh (loại bỏ "Thành phố", "Tỉnh", khoảng trắng thừa, v.v.)
   */
  sanitizeProvinceName(name: string): string {
    if (!name) return ''
    return name
      .replace(/Thành phố|Tỉnh/gi, '')
      .trim()
      .toLowerCase()
  }

  getRegion(provinceName: string): string | null {
    const sanitizedName = this.sanitizeProvinceName(provinceName)

    for (const [region, provinces] of Object.entries(this.PROVINCE_REGIONS)) {
      if (
        provinces.some(
          (p) => this.sanitizeProvinceName(p) === sanitizedName,
        )
      ) {
        return region
      }
    }
    return null
  }

  calculateProvinceProximity(province1: string, province2: string): number {
    if (!province1 || !province2) return 0.0

    const name1 = this.sanitizeProvinceName(province1)
    const name2 = this.sanitizeProvinceName(province2)

    if (name1 === name2) return 1.0

    const region1 = this.getRegion(province1)
    const region2 = this.getRegion(province2)

    if (region1 && region1 === region2) {
      return 0.2 // Cùng vùng địa lý
    }

    return 0.0
  }
}
