import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  checkinModel,
  checkoutModel,
  findControlConflicts,
  parseControlPoints,
  parseCoordPoints,
  todayISO,
  uid,
  type CheckoutInput,
} from "./logic";
import { buildSeedState } from "./seed";
import type { DeskState, Loan, ModelArchive } from "./types";

const STORAGE_KEY = "hxwl-10.borrow-desk.v1";

function loadState(): DeskState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DeskState;
      if (Array.isArray(parsed.models) && Array.isArray(parsed.loans)) {
        return parsed;
      }
    }
  } catch {
    // 存储损坏时回退到种子数据
  }
  return buildSeedState();
}

export interface RegisterInput {
  unit: string;
  layer: string;
  title: string;
  controlPoints: string;
  version: string;
  note: string;
  points: string;
}

interface DeskContextValue {
  models: ModelArchive[];
  loans: Loan[];
  today: string;
  registerModel: (input: RegisterInput) => { ok: boolean; message: string };
  lendModel: (modelId: string, input: CheckoutInput) => { ok: boolean; message: string };
  returnLoan: (loanId: string, note: string) => { ok: boolean; message: string };
  resetDesk: () => void;
}

const DeskContext = createContext<DeskContextValue | null>(null);

export function DeskProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DeskState>(loadState);
  const today = todayISO();

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // 存储不可用时仅保留内存态
    }
  }, [state]);

  const registerModel = useCallback((input: RegisterInput) => {
    const unit = input.unit.trim().toUpperCase();
    const layer = input.layer.trim();
    const version = input.version.trim() || "v1.0";
    const note = input.note.trim();
    const controlPoints = parseControlPoints(input.controlPoints);
    const points = parseCoordPoints(input.points);

    if (!unit || !layer) {
      return { ok: false, message: "请填写探方号和地层/遗迹单位。" };
    }
    if (controlPoints.length === 0) {
      return { ok: false, message: "请至少登记一个控制点编号。" };
    }

    let message = "";
    let ok = false;
    setState((prev) => {
      const conflicts = findControlConflicts(controlPoints, unit, prev.models);
      if (conflicts.length > 0) {
        message = conflicts
          .map(
            (c) =>
              `控制点 ${c.point} 已被探方 ${c.occupantUnit}（${c.modelTitle}）占用，提交被拦截。`
          )
          .join(" ");
        return prev;
      }

      const model: ModelArchive = {
        id: uid("md"),
        unit,
        layer,
        title: input.title.trim() || `${unit} · ${layer}`,
        controlPoints,
        createdAt: todayISO(),
        currentVersionId: "",
        versions: [
          {
            id: uid("ver"),
            version,
            createdAt: todayISO(),
            note: note || "归档登记",
            points,
          },
        ],
        copies: [],
      };
      model.currentVersionId = model.versions[0].id;

      message = `已归档：${model.title}（${version}），控制点 ${controlPoints.join("、")} 登记占用。`;
      ok = true;
      return { ...prev, models: [...prev.models, model] };
    });

    return { ok, message };
  }, []);

  const lendModel = useCallback((modelId: string, input: CheckoutInput) => {
    let message = "";
    let ok = false;
    setState((prev) => {
      const model = prev.models.find((m) => m.id === modelId);
      if (!model) {
        message = "未找到该模型。";
        return prev;
      }
      const result = checkoutModel(model, input, prev.loans);
      if (!result.ok) {
        message = result.reason;
        return prev;
      }
      ok = true;
      message =
        `已借出：原模型保留在库，脱敏副本「${result.copy.code}」已生成，` +
        `精确坐标已移除 ${result.copy.removedCount} 个。`;
      return {
        models: prev.models.map((m) => (m.id === modelId ? result.model : m)),
        loans: [...prev.loans, result.loan],
      };
    });
    return { ok, message };
  }, []);

  const returnLoan = useCallback((loanId: string, note: string) => {
    let message = "";
    let ok = false;
    setState((prev) => {
      const loan = prev.loans.find((l) => l.id === loanId);
      if (!loan || loan.status !== "active") {
        message = "该借用记录不存在或已归还。";
        return prev;
      }
      const model = prev.models.find((m) => m.id === loan.modelId);
      if (!model) {
        message = "未找到对应模型。";
        return prev;
      }
      const result = checkinModel(model, loan, note);
      if (!result.ok) {
        message = result.reason;
        return prev;
      }
      ok = true;
      message = result.loan.result ?? "已归还。";
      return {
        models: prev.models.map((m) => (m.id === model.id ? result.model : m)),
        loans: prev.loans.map((l) => (l.id === loanId ? result.loan : l)),
      };
    });
    return { ok, message };
  }, []);

  const resetDesk = useCallback(() => {
    setState(buildSeedState());
  }, []);

  const value = useMemo<DeskContextValue>(
    () => ({
      models: state.models,
      loans: state.loans,
      today,
      registerModel,
      lendModel,
      returnLoan,
      resetDesk,
    }),
    [state, today, registerModel, lendModel, returnLoan, resetDesk]
  );

  return <DeskContext.Provider value={value}>{children}</DeskContext.Provider>;
}

export function useDesk(): DeskContextValue {
  const ctx = useContext(DeskContext);
  if (!ctx) throw new Error("useDesk 必须在 DeskProvider 内使用");
  return ctx;
}
