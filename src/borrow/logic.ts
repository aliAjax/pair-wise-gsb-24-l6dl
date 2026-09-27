import type {
  CoordPoint,
  DesensitizedCopy,
  Loan,
  LoanPhase,
  ModelArchive,
  ModelVersion,
  RelativePoint,
} from "./types";

/** 本地日期 yyyy-mm-dd */
export function todayISO(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDateCN(iso: string): string {
  return iso;
}

/** 判断到期日是否已过（今天不算逾期，到期日次日起算逾期） */
export function isOverdue(dueDate: string, nowISO = todayISO()): boolean {
  return dueDate < nowISO;
}

export function loanPhase(loan: Loan, nowISO = todayISO()): LoanPhase {
  if (loan.status === "returned") return "returned";
  return isOverdue(loan.dueDate, nowISO) ? "overdue" : "active";
}

let seq = 0;
export function uid(prefix: string): string {
  seq += 1;
  return `${prefix}_${Date.now().toString(36)}${seq.toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

/** 解析控制点输入：K07、k 07 统一为 K07 */
export function parseControlPoints(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[，,、\s;；\n]+/)
        .map((s) => s.trim().toUpperCase().replace(/\s+/g, ""))
        .filter(Boolean)
    )
  );
}

/** 解析精确坐标点，每行：点名/E/N/高程，如 CP1/385620.12/4100215.40/46.80 */
export function parseCoordPoints(raw: string): CoordPoint[] {
  const points: CoordPoint[] = [];
  raw
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line, i) => {
      const parts = line.split(/[，,;；\s]+/).map((s) => s.trim());
      if (parts.length < 4) return;
      const x = Number(parts[parts.length - 3]);
      const y = Number(parts[parts.length - 2]);
      const z = Number(parts[parts.length - 1]);
      if (Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(z)) return;
      const name = parts.slice(0, parts.length - 3).join(" ") || `CP${i + 1}`;
      points.push({ name, x, y, z });
    });
  return points;
}

export interface ControlConflict {
  point: string;
  /** 占用该控制点的其他探方 */
  occupantUnit: string;
  modelTitle: string;
}

/**
 * 控制点冲突检查：一个控制点已被其他探方占用时，
 * 返回占用方信息（同探方内多个版本/模型共用不算冲突）。
 */
export function findControlConflicts(
  requested: string[],
  ownUnit: string,
  models: ModelArchive[]
): ControlConflict[] {
  const conflicts: ControlConflict[] = [];
  for (const point of requested) {
    const occupant = models.find(
      (m) =>
        m.unit !== ownUnit &&
        m.controlPoints.some((p) => p === point)
    );
    if (occupant) {
      conflicts.push({
        point,
        occupantUnit: occupant.unit,
        modelTitle: occupant.title,
      });
    }
  }
  return conflicts;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * 生成脱敏副本：移除精确绝对坐标，仅保留相对形心的偏移量。
 * 原模型不动，返回的是副本数据。
 */
export function buildDesensitizedCopy(
  model: ModelArchive,
  version: ModelVersion
): DesensitizedCopy {
  const n = Math.max(version.points.length, 1);
  const cx = version.points.reduce((s, p) => s + p.x, 0) / n;
  const cy = version.points.reduce((s, p) => s + p.y, 0) / n;
  const cz = version.points.reduce((s, p) => s + p.z, 0) / n;

  const relative: RelativePoint[] = version.points.map((p) => ({
    name: p.name,
    dx: round2(p.x - cx),
    dy: round2(p.y - cy),
    dz: round2(p.z - cz),
  }));

  const date = todayISO();
  return {
    id: uid("cp"),
    code: `${model.unit}-${model.layer}-${version.version}-脱敏-${date.slice(2).replace(/-/g, "")}`,
    modelId: model.id,
    sourceVersionId: version.id,
    createdAt: date,
    removedCount: version.points.length,
    points: relative,
  };
}

export interface CheckoutInput {
  org: string;
  purpose: string;
  custodian: string;
  dueDate: string;
}

export type CheckoutResult =
  | { ok: true; loan: Loan; copy: DesensitizedCopy; model: ModelArchive }
  | { ok: false; reason: string };

/**
 * 借出：保留原模型，按当前版本生成脱敏副本并登记借用信息。
 * 以下情况拦住提交：已借出未还、存在逾期未还记录、表单不全、到期日早于今天。
 */
export function checkoutModel(
  model: ModelArchive,
  input: CheckoutInput,
  loans: Loan[],
  nowISO = todayISO()
): CheckoutResult {
  const org = input.org.trim();
  const purpose = input.purpose.trim();
  const custodian = input.custodian.trim();
  const dueDate = input.dueDate.trim();

  if (!org || !purpose || !custodian || !dueDate) {
    return { ok: false, reason: "请完整登记借用单位、用途、保管人和到期日。" };
  }
  if (dueDate < nowISO) {
    return { ok: false, reason: "到期日不能早于今天。" };
  }

  const openLoans = loans.filter((l) => l.modelId === model.id && l.status === "active");
  const overdueOpen = openLoans.find((l) => isOverdue(l.dueDate, nowISO));
  if (overdueOpen) {
    return {
      ok: false,
      reason: `该模型已有逾期未还记录（${overdueOpen.org}，应还日期 ${overdueOpen.dueDate}），归还前不能再次借出。`,
    };
  }
  if (openLoans.length > 0) {
    return { ok: false, reason: "该模型已借出，尚未归还，不能重复借出。" };
  }

  const version =
    model.versions.find((v) => v.id === model.currentVersionId) ?? model.versions[0];
  const copy = buildDesensitizedCopy(model, version);
  const loan: Loan = {
    id: uid("ln"),
    modelId: model.id,
    sourceVersionId: version.id,
    sourceVersionLabel: version.version,
    org,
    purpose,
    custodian,
    dueDate,
    lentAt: nowISO,
    copyId: copy.id,
    status: "active",
  };

  const nextModel: ModelArchive = {
    ...model,
    copies: [...model.copies, copy],
  };

  return { ok: true, loan, copy, model: nextModel };
}

export type CheckinResult =
  | {
      ok: true;
      loan: Loan;
      model: ModelArchive;
    }
  | { ok: false; reason: string };

/**
 * 归还：恢复借出前版本（无论借出后档案是否更新过版本，都回退到借出时封存版本），
 * 结清借用记录并写明归还结果。
 */
export function checkinModel(
  model: ModelArchive,
  loan: Loan,
  note: string,
  nowISO = todayISO()
): CheckinResult {
  const source = model.versions.find((v) => v.id === loan.sourceVersionId);
  if (!source) {
    return {
      ok: false,
      reason: `找不到借出时封存的版本（${loan.sourceVersionLabel}），无法恢复。`,
    };
  }

  const previousLabel =
    model.versions.find((v) => v.id === model.currentVersionId)?.version ?? "未知版本";
  const trimmedNote = note.trim();

  const returned: Loan = {
    ...loan,
    status: "returned",
    returnedAt: nowISO,
    returnNote: trimmedNote,
    restoredVersionId: source.id,
    result:
      `已于 ${nowISO} 归还；模型从「${previousLabel}」恢复为借出前版本「${source.version}」，` +
      `借出的脱敏副本（编号见副本清单）不予归档精确坐标。` +
      (trimmedNote ? ` 归还备注：${trimmedNote}` : ""),
  };

  const restoredModel: ModelArchive = {
    ...model,
    currentVersionId: source.id,
  };

  return { ok: true, loan: returned, model: restoredModel };
}
