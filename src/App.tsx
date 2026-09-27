import { FormEvent, useEffect, useMemo, useState } from "react";
import "./styles.css";
import { LoanRecord, ModelArchive, SanitizedCopy } from "./types";
import { loadState, resetState, saveState } from "./storage";

/* ---------- 工具函数 ---------- */

function todayStr(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function fmtDate(iso?: string): string {
  return iso ? iso.slice(0, 10) : "—";
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86400000);
}

function isOverdue(loan: LoanRecord): boolean {
  return loan.status === "active" && loan.dueDate < todayStr();
}

function activeLoanOf(modelId: string, loans: LoanRecord[]): LoanRecord | undefined {
  return loans.find((l) => l.modelId === modelId && l.status === "active");
}

type ModelStatus = "在库" | "借出中" | "逾期未还";

function modelStatus(model: ModelArchive, loans: LoanRecord[]): ModelStatus {
  const active = activeLoanOf(model.id, loans);
  if (!active) return "在库";
  return isOverdue(active) ? "逾期未还" : "借出中";
}

function bumpVersion(version: string): string {
  const m = version.match(/^(.*?)(\d+)$/);
  if (!m) return `${version}.1`;
  return m[1] + String(parseInt(m[2], 10) + 1);
}

function genId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function parseControlPoints(text: string): string[] {
  const parts = text
    .split(/[,，、;；\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return Array.from(new Set(parts));
}

/* ---------- 通用小组件 ---------- */

function MetricCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <i className={tone} />
    </article>
  );
}

function StatusBadge({ status }: { status: ModelStatus | "已归还" }) {
  const cls =
    status === "在库"
      ? "badge badge-stock"
      : status === "借出中"
        ? "badge badge-loan"
        : status === "已归还"
          ? "badge badge-returned"
          : "badge badge-overdue";
  return <span className={cls}>{status}</span>;
}

function FormErrors({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;
  return (
    <div className="form-errors" role="alert">
      <strong>提交被拦截：</strong>
      <ul>
        {errors.map((e) => (
          <li key={e}>{e}</li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- 模型归档表单（含控制点占用校验） ---------- */

function ArchiveForm({
  models,
  onArchive,
}: {
  models: ModelArchive[];
  onArchive: (model: ModelArchive) => void;
}) {
  const [square, setSquare] = useState("");
  const [layer, setLayer] = useState("");
  const [version, setVersion] = useState("v1.0");
  const [controlText, setControlText] = useState("");
  const [coordinateCount, setCoordinateCount] = useState("120");
  const [errors, setErrors] = useState<string[]>([]);
  const [okMsg, setOkMsg] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setOkMsg("");
    const next: string[] = [];
    const sq = square.trim().toUpperCase();
    const ly = layer.trim();
    const ver = version.trim();
    const points = parseControlPoints(controlText);
    const count = parseInt(coordinateCount, 10);

    if (!sq) next.push("请填写探方编号。");
    if (!ly) next.push("请填写地层 / 遗迹单位。");
    if (!ver) next.push("请填写版本号。");
    if (points.length === 0) next.push("请至少填写一个控制点。");
    if (!Number.isFinite(count) || count <= 0) next.push("精确坐标点数需为正整数。");

    // 控制点占用校验：同一控制点不允许被其他探方占用，指出占用方并拦住提交
    for (const cp of points) {
      const occupiers = models.filter(
        (m) => m.square !== sq && m.controlPoints.includes(cp),
      );
      if (occupiers.length > 0) {
        const who = occupiers.map((o) => `${o.square}（${o.layer}）`).join("、");
        next.push(`控制点 ${cp} 已被其他探方占用，占用方：${who}。请更换控制点编号或先核实归属。`);
      }
    }

    setErrors(next);
    if (next.length > 0) return;

    onArchive({
      id: genId("m"),
      square: sq,
      layer: ly,
      version: ver,
      controlPoints: points,
      coordinateCount: count,
      archivedAt: new Date().toISOString(),
    });
    setSquare("");
    setLayer("");
    setVersion("v1.0");
    setControlText("");
    setCoordinateCount("120");
    setOkMsg(`已归档：${sq} / ${ly} / ${ver}`);
  }

  return (
    <form className="desk-form" onSubmit={handleSubmit}>
      <h2>模型归档</h2>
      <p className="form-hint">按探方、地层、版本归档三维模型；控制点在全遗址范围内按探方独占。</p>
      <label>
        <span>探方编号</span>
        <input value={square} onChange={(e) => setSquare(e.target.value)} placeholder="如 T0303" />
      </label>
      <label>
        <span>地层 / 遗迹单位</span>
        <input value={layer} onChange={(e) => setLayer(e.target.value)} placeholder="如 第4层 / H15灰坑" />
      </label>
      <div className="field-pair">
        <label>
          <span>版本号</span>
          <input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="v1.0" />
        </label>
        <label>
          <span>精确坐标点数</span>
          <input
            type="number"
            min={1}
            value={coordinateCount}
            onChange={(e) => setCoordinateCount(e.target.value)}
          />
        </label>
      </div>
      <label>
        <span>控制点（逗号分隔）</span>
        <input value={controlText} onChange={(e) => setControlText(e.target.value)} placeholder="如 K7, K8" />
      </label>
      <FormErrors errors={errors} />
      {okMsg && <p className="form-ok">{okMsg}</p>}
      <button type="submit" className="primary-action">
        归档模型
      </button>
    </form>
  );
}

/* ---------- 借出登记表单 ---------- */

function LendForm({
  models,
  loans,
  onLend,
}: {
  models: ModelArchive[];
  loans: LoanRecord[];
  onLend: (loan: LoanRecord, copy: SanitizedCopy) => void;
}) {
  const [modelId, setModelId] = useState("");
  const [borrower, setBorrower] = useState("");
  const [purpose, setPurpose] = useState("");
  const [custodian, setCustodian] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [okMsg, setOkMsg] = useState("");

  const available = models.filter((m) => modelStatus(m, loans) === "在库");
  const effectiveModelId = available.some((m) => m.id === modelId)
    ? modelId
    : (available[0]?.id ?? "");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setOkMsg("");
    const next: string[] = [];
    const model = models.find((m) => m.id === effectiveModelId);

    if (!model) {
      next.push("当前没有在库模型可借出。");
    } else {
      const active = activeLoanOf(model.id, loans);
      if (active && isOverdue(active)) {
        next.push(
          `模型 ${model.square}（${model.layer}）逾期未还（到期 ${active.dueDate}，借用单位：${active.borrower}），不能再次借出。`,
        );
      } else if (active) {
        next.push(`模型 ${model.square}（${model.layer}）已在借出中，不能重复借出。`);
      }
    }
    if (!borrower.trim()) next.push("请填写借用单位。");
    if (!purpose.trim()) next.push("请填写用途。");
    if (!custodian.trim()) next.push("请填写保管人。");
    if (!dueDate) next.push("请选择到期日。");
    else if (dueDate < todayStr()) next.push("到期日不能早于今天。");

    setErrors(next);
    if (next.length > 0 || !model) return;

    const now = new Date().toISOString();
    const loanId = genId("l");
    // 借出时保留原模型，仅生成移除精确坐标的脱敏副本
    const copy: SanitizedCopy = {
      id: genId("c"),
      loanId,
      modelId: model.id,
      square: model.square,
      layer: model.layer,
      version: model.version,
      createdAt: now,
      removedCoordinates: model.coordinateCount,
      controlPointLabels: model.controlPoints,
    };
    const loan: LoanRecord = {
      id: loanId,
      modelId: model.id,
      square: model.square,
      layer: model.layer,
      borrower: borrower.trim(),
      purpose: purpose.trim(),
      custodian: custodian.trim(),
      dueDate,
      loanedAt: now,
      versionAtLoan: model.version,
      status: "active",
      copyId: copy.id,
    };
    onLend(loan, copy);
    setModelId("");
    setBorrower("");
    setPurpose("");
    setCustodian("");
    setDueDate("");
    setOkMsg(`已借出 ${model.square}（${model.layer}）${loan.versionAtLoan}，并生成脱敏副本 ${copy.id.slice(0, 10)}…，原模型保留在库。`);
  }

  return (
    <form className="desk-form" onSubmit={handleSubmit}>
      <h2>借出登记</h2>
      <p className="form-hint">借出时保留原模型，自动生成移除精确坐标的脱敏副本交外单位。</p>
      <label>
        <span>选择模型（仅在库可借）</span>
        <select value={effectiveModelId} onChange={(e) => setModelId(e.target.value)}>
          {available.map((m) => (
            <option key={m.id} value={m.id}>
              {m.square} / {m.layer} / {m.version}
            </option>
          ))}
          {models
            .filter((m) => modelStatus(m, loans) !== "在库")
            .map((m) => {
              const st = modelStatus(m, loans);
              return (
                <option key={m.id} value={m.id} disabled>
                  {m.square} / {m.layer} / {m.version}（{st === "逾期未还" ? "逾期未还，禁止再借" : "借出中"}）
                </option>
              );
            })}
        </select>
      </label>
      <label>
        <span>借用单位</span>
        <input value={borrower} onChange={(e) => setBorrower(e.target.value)} placeholder="如 省文物考古研究所" />
      </label>
      <label>
        <span>用途</span>
        <input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="如 遗址展示建模 / 教学演示" />
      </label>
      <div className="field-pair">
        <label>
          <span>保管人</span>
          <input value={custodian} onChange={(e) => setCustodian(e.target.value)} placeholder="对方保管人姓名" />
        </label>
        <label>
          <span>到期日</span>
          <input type="date" min={todayStr()} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </label>
      </div>
      <FormErrors errors={errors} />
      {okMsg && <p className="form-ok">{okMsg}</p>}
      <button type="submit" className="primary-action" disabled={available.length === 0}>
        登记借出并生成脱敏副本
      </button>
      {available.length === 0 && <p className="form-hint">当前无在库模型，借出中的模型归还后方可再借。</p>}
    </form>
  );
}

/* ---------- 模型档案卡片 ---------- */

function ModelCard({
  model,
  loans,
  onReturn,
  onBumpVersion,
}: {
  model: ModelArchive;
  loans: LoanRecord[];
  onReturn: (loanId: string, returnedVersion: string) => void;
  onBumpVersion: (modelId: string) => void;
}) {
  const [returnVersion, setReturnVersion] = useState("");
  const status = modelStatus(model, loans);
  const active = activeLoanOf(model.id, loans);
  const overdueDays = active && isOverdue(active) ? daysBetween(active.dueDate, todayStr()) : 0;

  return (
    <article className={`model-card ${status === "逾期未还" ? "model-overdue" : ""}`}>
      <div className="model-head">
        <div>
          <h3>
            {model.square} <em>{model.layer}</em>
          </h3>
          <p className="model-meta">
            当前版本 <strong>{model.version}</strong> · 精确坐标 {model.coordinateCount} 点 · 归档于{" "}
            {fmtDate(model.archivedAt)}
          </p>
        </div>
        <StatusBadge status={status} />
      </div>
      <div className="chips">
        {model.controlPoints.map((cp) => (
          <span key={cp}>控制点 {cp}</span>
        ))}
      </div>

      {active && (
        <div className="loan-box">
          <p>
            借给 <strong>{active.borrower}</strong> · 保管人 {active.custodian} · 用途：{active.purpose}
          </p>
          <p>
            借出 {fmtDate(active.loanedAt)} · 到期 {active.dueDate} · 借出前版本{" "}
            <strong>{active.versionAtLoan}</strong>
            {active.versionAtLoan !== model.version && (
              <span className="restore-hint">（归还时将恢复至 {active.versionAtLoan}）</span>
            )}
          </p>
          {status === "逾期未还" && (
            <p className="overdue-warning">已逾期 {overdueDays} 天，归还前禁止再次借出。</p>
          )}
          <div className="return-row">
            <input
              value={returnVersion}
              onChange={(e) => setReturnVersion(e.target.value)}
              placeholder="对方交回版本（选填）"
            />
            <button
              onClick={() => {
                onReturn(active.id, returnVersion.trim());
                setReturnVersion("");
              }}
            >
              办理归还
            </button>
          </div>
        </div>
      )}

      <div className="model-actions">
        <button className="ghost-btn" onClick={() => onBumpVersion(model.id)}>
          登记新版本（{model.version} → {bumpVersion(model.version)}）
        </button>
      </div>
    </article>
  );
}

/* ---------- 主应用 ---------- */

function App() {
  const initial = useMemo(loadState, []);
  const [models, setModels] = useState<ModelArchive[]>(initial.models);
  const [loans, setLoans] = useState<LoanRecord[]>(initial.loans);
  const [copies, setCopies] = useState<SanitizedCopy[]>(initial.copies);

  // 任何变动都写回 localStorage，重开页面可查到借出、脱敏副本和归还结果
  useEffect(() => {
    saveState({ models, loans, copies });
  }, [models, loans, copies]);

  const inStock = models.filter((m) => modelStatus(m, loans) === "在库").length;
  const onLoan = loans.filter((l) => l.status === "active" && !isOverdue(l)).length;
  const overdue = loans.filter((l) => isOverdue(l)).length;

  function handleArchive(model: ModelArchive) {
    setModels((prev) => [...prev, model]);
  }

  function handleLend(loan: LoanRecord, copy: SanitizedCopy) {
    setLoans((prev) => [loan, ...prev]);
    setCopies((prev) => [copy, ...prev]);
  }

  function handleReturn(loanId: string, returnedVersion: string) {
    const loan = loans.find((l) => l.id === loanId);
    if (!loan || loan.status !== "active") return;
    const model = models.find((m) => m.id === loan.modelId);
    const now = new Date().toISOString();
    // 归还后恢复借出前版本
    const restoredTo = loan.versionAtLoan;
    setLoans((prev) =>
      prev.map((l) =>
        l.id === loanId
          ? {
              ...l,
              status: "returned",
              returnedAt: now,
              returnedVersion: returnedVersion || (model ? model.version : l.versionAtLoan),
              restoredTo,
            }
          : l,
      ),
    );
    setModels((prev) => prev.map((m) => (m.id === loan.modelId ? { ...m, version: restoredTo } : m)));
  }

  function handleBumpVersion(modelId: string) {
    setModels((prev) =>
      prev.map((m) => (m.id === modelId ? { ...m, version: bumpVersion(m.version) } : m)),
    );
  }

  function handleReset() {
    const fresh = resetState();
    setModels(fresh.models);
    setLoans(fresh.loans);
    setCopies(fresh.copies);
  }

  const sortedLoans = [...loans].sort((a, b) => b.loanedAt.localeCompare(a.loanedAt));

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">hxwl-10 · port 5110</p>
          <h1>考古探方模型借用台</h1>
          <p className="subtitle">
            探方三维模型按探方、地层与版本归档；借出时保留原模型并生成移除精确坐标的脱敏副本，归还后恢复借出前版本；控制点全遗址按探方独占，逾期未还禁止再次借出。
          </p>
        </div>
        <div className="stack-card">
          <span>数据保存</span>
          <strong>本地持久化，重开页面可查到借出、脱敏副本与归还结果</strong>
        </div>
      </section>

      <section className="metrics-grid">
        <MetricCard label="在库模型" value={inStock} tone="status-ok" />
        <MetricCard label="借出中" value={onLoan} tone="status-watch" />
        <MetricCard label="逾期未还" value={overdue} tone="status-danger" />
        <MetricCard label="脱敏副本" value={copies.length} tone="status-ok" />
      </section>

      <section className="workspace">
        <aside className="panel narrow">
          <ArchiveForm models={models} onArchive={handleArchive} />
          <hr className="divider" />
          <LendForm models={models} loans={loans} onLend={handleLend} />
        </aside>

        <section className="panel">
          <div className="section-heading">
            <div>
              <p>模型档案</p>
              <h2>按探方 · 地层 · 版本归档</h2>
            </div>
            <button className="ghost-btn" onClick={handleReset}>
              恢复演示数据
            </button>
          </div>
          <div className="model-list">
            {models.map((m) => (
              <ModelCard
                key={m.id}
                model={m}
                loans={loans}
                onReturn={handleReturn}
                onBumpVersion={handleBumpVersion}
              />
            ))}
          </div>
        </section>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p>坐标脱敏</p>
            <h2>脱敏副本（原模型保留在库）</h2>
          </div>
        </div>
        <div className="copy-grid">
          {copies.map((c) => (
            <article key={c.id} className="copy-card">
              <div className="copy-head">
                <h3>
                  {c.square} <em>{c.layer}</em>
                </h3>
                <span className="badge badge-copy">已脱敏</span>
              </div>
              <p>
                基于版本 <strong>{c.version}</strong> 生成于 {fmtDate(c.createdAt)}，已移除精确坐标{" "}
                <strong>{c.removedCoordinates}</strong> 点，仅保留控制点编号与相对网格。
              </p>
              <div className="chips">
                {c.controlPointLabels.map((cp) => (
                  <span key={cp}>{cp}</span>
                ))}
              </div>
            </article>
          ))}
          {copies.length === 0 && <p className="empty-hint">暂无脱敏副本，登记借出后自动生成。</p>}
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p>借用台账</p>
            <h2>借出与归还记录</h2>
          </div>
        </div>
        <div className="record-list">
          {sortedLoans.map((loan, index) => {
            const overdueNow = isOverdue(loan);
            const status: ModelStatus | "已归还" =
              loan.status === "returned" ? "已归还" : overdueNow ? "逾期未还" : "借出中";
            return (
              <article key={loan.id} className="record-card">
                <div className="record-index">{String(index + 1).padStart(2, "0")}</div>
                <div className="record-body">
                  <div className="record-title">
                    <h3>
                      {loan.square} <em>{loan.layer}</em> · {loan.borrower}
                    </h3>
                    <StatusBadge status={status} />
                  </div>
                  <p>
                    用途：{loan.purpose} · 保管人 {loan.custodian} · 借出 {fmtDate(loan.loanedAt)} · 到期{" "}
                    {loan.dueDate}
                  </p>
                  {loan.status === "returned" ? (
                    <p className="return-result">
                      已于 {fmtDate(loan.returnedAt)} 归还：对方交回 {loan.returnedVersion}
                      ，档案已恢复至借出前版本 <strong>{loan.restoredTo}</strong>。
                    </p>
                  ) : overdueNow ? (
                    <p className="overdue-warning">
                      已逾期 {daysBetween(loan.dueDate, todayStr())} 天，归还前该模型禁止再次借出。
                    </p>
                  ) : (
                    <p className="form-hint">借出前版本 {loan.versionAtLoan}，归还时将恢复至该版本。</p>
                  )}
                </div>
              </article>
            );
          })}
          {sortedLoans.length === 0 && <p className="empty-hint">暂无借用记录。</p>}
        </div>
      </section>
    </main>
  );
}

export default App;
