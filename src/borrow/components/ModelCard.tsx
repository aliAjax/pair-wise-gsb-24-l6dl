import { useState } from "react";
import { isOverdue } from "../logic";
import { useDesk } from "../store";
import type { DesensitizedCopy, Loan, ModelArchive } from "../types";

function fmtCoord(n: number): string {
  return n.toFixed(2);
}

function CopyDetail({ copy }: { copy: DesensitizedCopy }) {
  return (
    <div className="copy-detail">
      <p className="copy-meta">
        生成于 {copy.createdAt} · 已移除精确坐标 {copy.removedCount} 个，仅保留相对位置（米）
      </p>
      {copy.points.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>点位</th>
              <th>ΔE</th>
              <th>ΔN</th>
              <th>Δ高程</th>
            </tr>
          </thead>
          <tbody>
            {copy.points.map((p) => (
              <tr key={p.name}>
                <td>{p.name}</td>
                <td>{p.dx.toFixed(2)}</td>
                <td>{p.dy.toFixed(2)}</td>
                <td>{p.dz.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="copy-meta">该版本未记录坐标点。</p>
      )}
    </div>
  );
}

function LendForm({ model, onDone }: { model: ModelArchive; onDone: () => void }) {
  const { lendModel, today } = useDesk();
  const [org, setOrg] = useState("");
  const [purpose, setPurpose] = useState("");
  const [custodian, setCustodian] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const submit = () => {
    setError("");
    setSuccess("");
    const result = lendModel(model.id, { org, purpose, custodian, dueDate });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setSuccess(result.message);
    onDone();
  };

  return (
    <div className="lend-form">
      <div className="lend-grid">
        <label>
          <span>借用单位</span>
          <input
            value={org}
            onChange={(e) => setOrg(e.target.value)}
            placeholder="如：省文物考古研究院"
          />
        </label>
        <label>
          <span>保管人</span>
          <input
            value={custodian}
            onChange={(e) => setCustodian(e.target.value)}
            placeholder="对方单位经手人"
          />
        </label>
        <label className="span-2">
          <span>用途</span>
          <input
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="如：聚落形态对比研究"
          />
        </label>
        <label>
          <span>到期日</span>
          <input
            type="date"
            min={today}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </label>
        <div className="lend-actions">
          <button className="primary-action" onClick={submit}>
            确认借出（生成脱敏副本）
          </button>
        </div>
      </div>
      {error && <p className="form-error">{error}</p>}
      {success && <p className="form-success">{success}</p>}
    </div>
  );
}

function ActiveLoanBanner({ loan }: { loan: Loan }) {
  const { today, returnLoan } = useDesk();
  const overdue = isOverdue(loan.dueDate, today);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");

  const doReturn = () => {
    const result = returnLoan(loan.id, note);
    setMessage(result.message);
  };

  return (
    <div className={`loan-banner ${overdue ? "is-overdue" : ""}`}>
      <div className="loan-banner-head">
        <strong>{overdue ? "已逾期未还" : "借出中"}</strong>
        <span>
          {loan.org} · 保管人 {loan.custodian} · 用途：{loan.purpose}
        </span>
      </div>
      <p className="loan-banner-dates">
        借出 {loan.lentAt} · 应还 {loan.dueDate} · 借出前封存版本 {loan.sourceVersionLabel}
      </p>
      {overdue && (
        <p className="overdue-note">
          该模型已逾期未还，归还前不能再次借出。
        </p>
      )}
      <div className="return-row">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="归还备注（副本处置、核对情况等）"
        />
        <button className="primary-action" onClick={doReturn}>
          办理归还
        </button>
      </div>
      {message && <p className="form-success">{message}</p>}
    </div>
  );
}

export function ModelCard({ model }: { model: ModelArchive }) {
  const { loans } = useDesk();
  const [lendOpen, setLendOpen] = useState(false);
  const [openCopyId, setOpenCopyId] = useState<string | null>(null);

  const activeLoan = loans.find((l) => l.modelId === model.id && l.status === "active");
  const currentVersion =
    model.versions.find((v) => v.id === model.currentVersionId) ?? model.versions[0];

  return (
    <article className="model-card">
      <header className="model-head">
        <div>
          <h3>{model.title}</h3>
          <p className="model-meta">
            探方 {model.unit} · 地层 {model.layer} · 归档于 {model.createdAt}
          </p>
        </div>
        <span className={`status-pill ${activeLoan ? "pill-lent" : "pill-idle"}`}>
          {activeLoan ? "借出中" : "在库可借"}
        </span>
      </header>

      <div className="control-row">
        <span className="row-label">控制点</span>
        <div className="chips">
          {model.controlPoints.map((p) => (
            <span key={p}>{p}</span>
          ))}
        </div>
      </div>

      <div className="version-block">
        <span className="row-label">版本归档</span>
        <ul className="version-list">
          {model.versions.map((v) => (
            <li
              key={v.id}
              className={v.id === model.currentVersionId ? "is-current" : ""}
            >
              <div className="version-line">
                <strong>{v.version}</strong>
                {v.id === model.currentVersionId && <em>当前</em>}
                <span className="version-note">
                  {v.createdAt} · {v.note} · 坐标点 {v.points.length} 个
                </span>
              </div>
              {v.points.length > 0 && (
                <div className="coord-line">
                  {v.points
                    .map((p) => `${p.name} E${fmtCoord(p.x)} N${fmtCoord(p.y)} H${fmtCoord(p.z)}`)
                    .join("；")}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="copy-block">
        <span className="row-label">脱敏副本（{model.copies.length}）</span>
        {model.copies.length === 0 ? (
          <p className="empty-hint">尚未生成脱敏副本，借出时自动生成。</p>
        ) : (
          <ul className="copy-list">
            {model.copies.map((c) => (
              <li key={c.id}>
                <button
                  className="copy-toggle"
                  onClick={() => setOpenCopyId(openCopyId === c.id ? null : c.id)}
                >
                  <span className="copy-code">{c.code}</span>
                  <span>{openCopyId === c.id ? "收起" : "查看副本"}</span>
                </button>
                {openCopyId === c.id && <CopyDetail copy={c} />}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="model-actions">
        {activeLoan ? (
          <ActiveLoanBanner loan={activeLoan} />
        ) : lendOpen ? (
          <LendForm model={model} onDone={() => setLendOpen(false)} />
        ) : (
          <button className="primary-action" onClick={() => setLendOpen(true)}>
            借出（保留原模型，生成脱敏副本）
          </button>
        )}
      </div>
    </article>
  );
}
