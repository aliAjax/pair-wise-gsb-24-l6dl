// 借用台领域模型：探方 / 地层 / 版本归档、脱敏副本、借出与归还记录

export interface CoordPoint {
  name: string;
  /** 东坐标 E */
  x: number;
  /** 北坐标 N */
  y: number;
  /** 高程 */
  z: number;
}

export interface RelativePoint {
  name: string;
  /** 相对形心的偏移量（米），绝对坐标已移除 */
  dx: number;
  dy: number;
  dz: number;
}

export interface ModelVersion {
  id: string;
  /** 版本号，如 v1.0 */
  version: string;
  createdAt: string;
  note: string;
  /** 精确坐标点，仅保存在本单位封存档案中 */
  points: CoordPoint[];
}

export interface DesensitizedCopy {
  id: string;
  /** 副本编号/名称，如 T0204-H12灰坑-v1.0-脱敏-260912 */
  code: string;
  modelId: string;
  sourceVersionId: string;
  createdAt: string;
  /** 被移除的精确坐标点数量 */
  removedCount: number;
  /** 仅保留相对位置，不含 E/N/高程 等绝对坐标 */
  points: RelativePoint[];
}

export interface Loan {
  id: string;
  modelId: string;
  /** 借出时封存的版本（借出前版本），归还时恢复到该版本 */
  sourceVersionId: string;
  sourceVersionLabel: string;
  /** 借用单位 */
  org: string;
  /** 用途 */
  purpose: string;
  /** 保管人 */
  custodian: string;
  /** 到期日 yyyy-mm-dd */
  dueDate: string;
  /** 借出日期 yyyy-mm-dd */
  lentAt: string;
  copyId?: string;
  status: "active" | "returned";
  returnedAt?: string;
  returnNote?: string;
  restoredVersionId?: string;
  /** 归还结果说明 */
  result?: string;
}

export interface ModelArchive {
  id: string;
  /** 探方号，如 T0203 */
  unit: string;
  /** 地层/遗迹单位，如 第3层、H12灰坑 */
  layer: string;
  title: string;
  /** 该探方占用的控制点编号 */
  controlPoints: string[];
  versions: ModelVersion[];
  currentVersionId: string;
  /** 历次借出时生成的脱敏副本 */
  copies: DesensitizedCopy[];
  createdAt: string;
}

export interface DeskState {
  models: ModelArchive[];
  loans: Loan[];
}

export type LoanPhase = "active" | "overdue" | "returned";
