import "./styles.css";
import { DeskProvider, useDesk } from "./borrow/store";
import { Overview } from "./borrow/components/Overview";
import { ModelCard } from "./borrow/components/ModelCard";
import { Ledger } from "./borrow/components/Ledger";

function Desk() {
  const { models } = useDesk();

  const sorted = [...models].sort((a, b) => {
    const u = a.unit.localeCompare(b.unit);
    return u !== 0 ? u : a.layer.localeCompare(b.layer);
  });

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">hxwl-10 · 探方三维模型借用台</p>
          <h1>考古探方模型借用台</h1>
          <p className="subtitle">
            模型按探方、地层和版本归档；借出时保留原模型并生成移除精确坐标的脱敏副本，
            归还后恢复借出前封存版本；控制点跨探方占用会被拦截，逾期未还不可再次借出。
          </p>
        </div>
        <div className="stack-card">
          <span>借还规则</span>
          <strong>原件封存 · 副本脱敏 · 归还回退版本 · 台账可查</strong>
        </div>
      </section>

      <Overview />

      <section className="archive-section">
        <div className="section-heading archive-heading">
          <div>
            <p>模型档案</p>
            <h2>探方 / 地层 / 版本</h2>
          </div>
        </div>
        <div className="model-grid">
          {sorted.map((model) => (
            <ModelCard key={model.id} model={model} />
          ))}
        </div>
      </section>

      <Ledger />

      <footer className="desk-footer">
        借还记录、脱敏副本与归还结果保存在本机浏览器（localStorage），重开页面仍可查询。
      </footer>
    </main>
  );
}

function App() {
  return (
    <DeskProvider>
      <Desk />
    </DeskProvider>
  );
}

export default App;
