import { useMemo } from "react";
import { isOverdue } from "../logic";
import { useDesk } from "../store";
import { RegisterForm } from "./RegisterForm";

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "ok" | "watch" | "danger" | "plain";
}) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <i className={`status-${tone}`} />
    </article>
  );
}

export function Overview() {
  const { models, loans, today, resetDesk } = useDesk();

  const activeLoans = loans.filter((l) => l.status === "active");
  const overdueCount = activeLoans.filter((l) => isOverdue(l.dueDate, today)).length;
  const returnedCount = loans.filter((l) => l.status === "returned").length;

  const pointRows = useMemo(() => {
    const map = new Map<string, { unit: string; layer: string }[]>();
    models.forEach((m) => {
      m.controlPoints.forEach((p) => {
        const list = map.get(p) ?? [];
        list.push({ unit: m.unit, layer: m.layer });
        map.set(p, list);
      });
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([point, holders]) => ({ point, holders }));
  }, [models]);

  return (
    <>
      <section className="metrics-grid">
        <MetricCard label="归档模型" value={models.length} tone="ok" />
        <MetricCard label="当前在借" value={activeLoans.length} tone="watch" />
        <MetricCard label="逾期未还" value={overdueCount} tone="danger" />
        <MetricCard label="已归还" value={returnedCount} tone="plain" />
      </section>

      <section className="workspace">
        <aside className="panel narrow">
          <h2>控制点占用总览</h2>
          <p className="side-note">
            同一控制点不能被不同探方占用；归档登记时会据此拦截提交。
          </p>
          <ul className="point-list">
            {pointRows.map((row) => (
              <li key={row.point}>
                <span className="point-code">{row.point}</span>
                <span className="point-holder">
                  {row.holders.map((h) => `${h.unit} ${h.layer}`).join("、")}
                </span>
              </li>
            ))}
          </ul>
          <button className="reset-btn" onClick={resetDesk}>
            恢复演示数据
          </button>
        </aside>

        <RegisterForm />
      </section>
    </>
  );
}
