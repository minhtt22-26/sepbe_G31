export enum CompanyStatus {
  PENDING, // Chờ duyệt
  APPROVED, // Đã duyệt
  REJECTED, // Bị từ chối
  DELETED,
  NEED_MORE_INFO
}

export enum EnumUserGender {
  MALE,
  FEMALE,
  OTHER,
}

export enum EnumUserRole {
  WORKER,
  EMPLOYER,
  ADMIN,
  MANAGER,
}

export enum EnumUserStatus {
  ACTIVE,
  INACTIVE,
  BLOCKED,
  DELETED,
}

export enum EnumUserLoginWith {
  CREDENTIAL,
  SOCIAL_GOOGLE,
}

export enum MediaOwnerType {
  COMPANY,
  USER,
}

export enum EnumShift {
  MORNING,
  AFTERNOON,
  NIGHT,
  FULL_DAY,
  FLEXIBLE,
}

export enum SectorStatus {
  ACTIVE,
  DELETED,
}

export enum JobStatus {
  PENDING, // tạo nhưng chưa public
  PUBLISHED, // đang tuyển, worker thấy & apply được
  PAUSED, // tạm dừng (đủ người, chờ xử lý)
  CLOSED, // tuyển xong / ngừng hẳn
  EXPIRED, // hết hạn tự động
  DELETED,
}

export enum JobApplicationStatus {
  APPLIED, // worker vừa nộp hồ sơ
  VIEWED, // employer đã xem
  INTERVIEW, // mời phỏng vấn / test
  REJECTED, // bị từ chối
  CANCELLED, // worker tự rút hồ sơ
}

export enum ReportStatus {
  PENDING,
  REVIEWED,
  RESOLVED,
  REJECTED,
}

export enum ReportReason {
  FRAUD,
  INAPPROPRIATE_CONTENT,
  SCAM,
  DUPLICATE,
  MISLEADING_INFO,
  OTHER,
}

export enum ReviewReportStatus {
  PENDING,
  REVIEWED,
  RESOLVED,
  REJECTED,
}

export enum ReviewStatus {
  ACTIVE,
  HIDDEN,
  DELETED,
}

export enum TokenType {
  PASSWORD_RESET,
  EMAIL_VERIFICATION,
}

export enum PaymentStatus {
  PENDING,
  COMPLETED,
  FAILED,
  REFUNDED,
  CANCELLED,
}

export enum PaymentMethod {
  MOMO,
  VNPAY,
  ZALOPAY,
  BANK_TRANSFER,
  CREDIT_CARD,
}

export enum OrderType {
  BOOST_JOB,
  PREMIUM_SUBSCRIPTION,
  FEATURE_LISTING,
}

export enum MediaType {
  IMAGE,
  VIDEO,
  DOCUMENT,
  OTHER,
}