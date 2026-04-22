export class OverviewMetricDto {
  value: number
  changePercent: number
}

export class OverviewResponseDto {
  totalViews: OverviewMetricDto
  totalApplications: OverviewMetricDto
  conversionRate: OverviewMetricDto
  activeJobs: OverviewMetricDto
  newJobsThisWeek: number
}
