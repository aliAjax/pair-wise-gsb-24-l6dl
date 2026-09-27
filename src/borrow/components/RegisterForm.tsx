import { useState } from "react";
import { useDesk, type RegisterInput } from "../store";

export function RegisterForm() {
  const { registerModel } = useDesk();
  const [form, setForm] = useState<RegisterInput>({
    unit: "",
    layer: "",
    title: "",
    controlPoints: "",
    version: "v1.0",
    note: "",
    points: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const set = (key: keyof RegisterInput) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = () => {
    setError("");
    setSuccess("");
    const result = registerModel(form);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setSuccess(result.message);
    setForm({
      unit: "",
      layer: "",
      title: "",
      controlPoints: "",
      version: "v1.0",
      note: "",
      points: "",
    });
  };

  return (
    <section className="panel register-panel">
      <div className="section-heading">
        <div>
          <p>模型归档</p>
          <h2>按探方 / 地层 / 版本登记</h2>
        </div>
      </div>

      <div className="field-grid">
        <label>
          <span>探方号 *</span>
          <input value={form.unit} onChange={set("unit")} placeholder="如 T0401" />
        </label>
        <label>
          <span>地层 / 遗迹单位 *</span>
          <input value={form.layer} onChange={set("layer")} placeholder="如 第4层 / H18灰坑" />
        </label>
        <label className="span-2">
          <span>模型标题（留空自动生成）</span>
          <input value={form.title} onChange={set("title")} placeholder="探方 · 地层" />
        </label>
        <label className="span-2">
          <span>控制点编号 *（多个用逗号或空格分隔，如 K03, K04）</span>
          <input
            value={form.controlPoints}
            onChange={set("controlPoints")}
            placeholder="K03, K04"
          />
        </label>
        <label>
          <span>版本号</span>
          <input value={form.version} onChange={set("version")} />
        </label>
        <label>
          <span>版本说明</span>
          <input value={form.note} onChange={set("note")} placeholder="初扫 / 补扫说明" />
        </label>
        <label className="span-2">
          <span>精确坐标点（每行一个：点名 E N 高程）</span>
          <textarea
            rows={3}
            value={form.points}
            onChange={(e) => setForm((f) => ({ ...f, points: e.target.value }))}
            placeholder={"CP1 385620.12 4100215.40 46.80\nCP2 385625.36 4100219.05 46.92"}
          />
        </label>
      </div>

      <button className="primary-action register-btn" onClick={submit}>
        提交归档登记
      </button>
      {error && <p className="form-error">{error}</p>}
      {success && <p className="form-success">{success}</p>}
    </section>
  );
}
