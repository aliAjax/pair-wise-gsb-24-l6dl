/** 探方三维模型档案：按探方、地层、版本归档 */
export interface ModelArchive {
  id: string;
  /** 探方编号，如 T0203 */
  square: string;
  /** 地层 / 遗迹单位，如 第3层、H12灰坑 */
  layer: string;
  /** 当前版本号，如 v1.2 */
  version: string;
  /** 控制点编号列表，如 ["K1","K2"] */
  controlPoints: string[];
  /** 模型内精确坐标点数量（脱敏时被移除的对象） */
  coordinateCount: number;
  /** 归档时间 ISO 字符串 */
  archivedAt: string;
}

export type LoanStatus = "active" | "returned";

/** 借用登记与归还结果 */
export interface LoanRecord {
  id: string;
  modelId: string;
  /** 冗余存一份，模型后续升版后仍能正确展示来源 */
  square: string;
  layer: string;
  /** 借用单位 */
  borrower: string;
  /** 用途 */
  purpose: string;
  /** 保管人 */
  custodian: string;
  /** 到期日 YYYY-MM-DD */
  dueDate: string;
  /** 借出时间 ISO 字符串 */
  loanedAt: string;
  /** 借出前版本快照，归还时恢复到此版本 */
  versionAtLoan: string;
  status: LoanStatus;
  /** 归还时间 ISO 字符串 */
  returnedAt?: string;
  /** 对方交回的版本号 */
  returnedVersion?: string;
  /** 归还后恢复到的版本（即借出前版本） */
  restoredTo?: string;
  /** 对应的脱敏副本 id */
  copyId: string;
}

/** 脱敏副本：移除精确坐标，仅保留控制点编号与相对网格 */
export interface SanitizedCopy {
  id: string;
  loanId: string;
  modelId: string;
  square: string;
  layer: string;
  /** 生成副本时的模型版本 */
  version: string;
  createdAt: string;
  /** 已移除的精确坐标点数 */
  removedCoordinates: number;
  /** 副本中仅保留的控制点编号 */
  controlPointLabels: string[];
}

export interface DeskState {
  models: ModelArchive[];
  loans: LoanRecord[];
  copies: SanitizedCopy[];
}
