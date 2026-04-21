export class ApplicationFunnelResponseDto {
  applied: number
  viewed: number
  suitable: number
  unsuitable: number
  cancelled: number
  total: number
  timeline: {
    period: string
    views: number
    applications: number
  }[]
  jobInfo?: {
    title: string
    occupationName: string
    status: string
    viewCount: number
    applicationsCount: number
    conversionRate: number
  }
}
