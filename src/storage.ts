import { DeskState } from "./types";

const STORAGE_KEY = "hxwl-10-loan-desk-v1";

/**
 * 初始演示数据（基准日期 2026-09-27）：
 * - T0204 借出中，且借出期间档案升版到 v1.1，归还时将恢复至借出前 v1.0
 * - T0301 已逾期未还，用于演示“逾期未还禁止再次借出”
 * - T0302 有一笔已归还记录，演示“归还后恢复借出前版本”
 */
const seedState: DeskState = {
  models: [
    {
      id: "m-t0203",
      square: "T0203",
      layer: "第3层",
      version: "v1.2",
      controlPoints: ["K1", "K2"],
      coordinateCount: 236,
      archivedAt: "2026-05-18T09:00:00.000Z",
    },
    {
      id: "m-t0204",
      square: "T0204",
      layer: "H12灰坑",
      version: "v1.1",
      controlPoints: ["K3"],
      coordinateCount: 158,
      archivedAt: "2026-06-02T09:00:00.000Z",
    },
    {
      id: "m-t0301",
      square: "T0301",
      layer: "F2房址",
      version: "v1.1",
      controlPoints: ["K4", "K5"],
      coordinateCount: 342,
      archivedAt: "2026-06-20T09:00:00.000Z",
    },
    {
      id: "m-t0302",
      square: "T0302",
      layer: "第2层",
      version: "v2.0",
      controlPoints: ["K6"],
      coordinateCount: 197,
      archivedAt: "2026-07-01T09:00:00.000Z",
    },
  ],
  loans: [
    {
      id: "l-t0204",
      modelId: "m-t0204",
      square: "T0204",
      layer: "H12灰坑",
      borrower: "省文物考古研究所",
      purpose: "遗址公园三维展示建模",
      custodian: "王磊",
      dueDate: "2026-10-15",
      loanedAt: "2026-09-05T10:00:00.000Z",
      versionAtLoan: "v1.0",
      status: "active",
      copyId: "c-t0204",
    },
    {
      id: "l-t0301",
      modelId: "m-t0301",
      square: "T0301",
      layer: "F2房址",
      borrower: "某高校考古系",
      purpose: "课堂教学演示",
      custodian: "陈静",
      dueDate: "2026-09-10",
      loanedAt: "2026-08-20T10:00:00.000Z",
      versionAtLoan: "v1.1",
      status: "active",
      copyId: "c-t0301",
    },
    {
      id: "l-t0302",
      modelId: "m-t0302",
      square: "T0302",
      layer: "第2层",
      borrower: "市博物馆",
      purpose: "基本陈列数字展项",
      custodian: "刘洋",
      dueDate: "2026-09-01",
      loanedAt: "2026-08-01T09:00:00.000Z",
      versionAtLoan: "v2.0",
      status: "returned",
      returnedAt: "2026-08-28T15:00:00.000Z",
      returnedVersion: "v2.1",
      restoredTo: "v2.0",
      copyId: "c-t0302",
    },
  ],
  copies: [
    {
      id: "c-t0204",
      loanId: "l-t0204",
      modelId: "m-t0204",
      square: "T0204",
      layer: "H12灰坑",
      version: "v1.0",
      createdAt: "2026-09-05T10:00:00.000Z",
      removedCoordinates: 158,
      controlPointLabels: ["K3"],
    },
    {
      id: "c-t0301",
      loanId: "l-t0301",
      modelId: "m-t0301",
      square: "T0301",
      layer: "F2房址",
      version: "v1.1",
      createdAt: "2026-08-20T10:00:00.000Z",
      removedCoordinates: 342,
      controlPointLabels: ["K4", "K5"],
    },
    {
      id: "c-t0302",
      loanId: "l-t0302",
      modelId: "m-t0302",
      square: "T0302",
      layer: "第2层",
      version: "v2.0",
      createdAt: "2026-08-01T09:00:00.000Z",
      removedCoordinates: 197,
      controlPointLabels: ["K6"],
    },
  ],
};

export function loadState(): DeskState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedState;
    const parsed = JSON.parse(raw) as DeskState;
    if (!Array.isArray(parsed.models) || !Array.isArray(parsed.loans) || !Array.isArray(parsed.copies)) {
      return seedState;
    }
    return parsed;
  } catch {
    return seedState;
  }
}

export function saveState(state: DeskState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetState(): DeskState {
  localStorage.removeItem(STORAGE_KEY);
  return seedState;
}
