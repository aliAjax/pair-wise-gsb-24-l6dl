import { useMemo, useState } from "react";
import { loanPhase } from "../logic";
import { useDesk } from "../store";
import type { LoanPhase } from "../types";

type Filter = "all" | LoanPhase;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "active", label: "借出中" },
  { key: "overdue", label: "逾期未还" },
  { key: "returned", label: "已归还" },
];

const PHASE_LABEL: Record<LoanPhase, string> = {
  active: "借出中",
  overdue: "逾期未还",
  returned: "已归还",
};

export function Ledger() {
  const { loans, models, today } = useDesk();
  const [filter, setFilter] = useState<Filter>("all");

  const rows = useMemo(() => {
    const enriched = loans.map((loan) => {
      const model = models.find((m) => m.id === loan.modelId);
      const phase = loanPhase(loan, today);
      const copy = model?.copies.find((c) => c.id === loan.copyId);
      return { loan, model, phase, copy };
    });
    const filtered = filter === "all" ? enriched : enriched.filter((r) => r.phase === filter);
    return filtered.sort((a, b) => b.loan.lentAt.localeCompare(a.loan.lentAt));
  }, [loans, models, filter, today]);

  return (
    <section className="panel ledger-panel">
      <div className="section-heading">
        <div>
          <p>借用台账</p>
          <h2>借出 · 脱敏副本 · 归还结果</h2>
        </div>
        <div className="chips muted filter-chips">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={filter === f.key ? "is-active" : ""}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="empty-hint">没有符合条件的借用记录。</p>
      ) : (
        <div className="ledger-list">
          {rows.map(({ loan, model, phase, copy }) => (
            <article key={loan.id} className={`ledger-card phase-${phase}`}>
              <header className="ledger-head">
                <div>
                  <h3>
                    {model ? model.title : "（已归档外模型）"}
                    <span className={`ledger-badge badge-${phase}`}>{PHASE_LABEL[phase]}</span>
                  </h3>
                  <p className="model-meta">
                    借出 {loan.lentAt} · 应还 {loan.dueDate}
                    {loan.returnedAt ? ` · 实际归还 ${loan.returnedAt}` : ""}
                  </p>
                </div>
              </header>

              <dl className="kv-grid">
                <div>
                  <dt>借用单位</dt>
                  <dd>{loan.org}</dd>
                </div>
                <div>
                  <dt>保管人</dt>
                  <dd>{loan.custodian}</dd>
                </div>
                <div>
                  <dt>用途</dt>
                  <dd>{loan.purpose}</dd>
                </div>
                <div>
                  <dt>借出前封存版本</dt>
                  <dd>{loan.sourceVersionLabel}</dd>
                </div>
                <div className="kv-wide">
                  <dt>脱敏副本</dt>
                  <dd>
                    {copy ? (
                      <>
                        <span className="copy-code">{copy.code}</span>
                        <span className="copy-sub">
                          （已移除精确坐标 {copy.removedCount} 个，仅存相对坐标）
                        </span>
                      </>
                    ) : (
                      "未关联副本"
                    )}
                  </dd>
                </div>
              </dl>

              {loan.status === "returned" && (
                <p className="return-result">
                  <span className="result-tag">归还结果</span>
                  {loan.result ??
                    `已恢复到借出前版本 ${loan.sourceVersionLabel}。${
                      loan.returnNote ? ` 备注：${loan.returnNote}` : ""
                    }`}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
