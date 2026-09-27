import { buildDesensitizedCopy } from "./logic";
import type { DeskState, ModelArchive, ModelVersion } from "./types";

function v(
  id: string,
  version: string,
  createdAt: string,
  note: string,
  points: ModelVersion["points"]
): ModelVersion {
  return { id, version, createdAt, note, points };
}

const m1: ModelArchive = {
  id: "md_t0203",
  unit: "T0203",
  layer: "第3层",
  title: "T0203 · 第3层",
  controlPoints: ["K03", "K04"],
  createdAt: "2026-03-18",
  currentVersionId: "ver_m1_v1",
  versions: [
    v("ver_m1_v1", "v1.0", "2026-03-20", "发掘收尾三维扫描，含灰褐土层面", [
      { name: "CP1", x: 385620.12, y: 4100215.4, z: 46.8 },
      { name: "CP2", x: 385625.36, y: 4100219.05, z: 46.92 },
      { name: "CP3", x: 385618.74, y: 4100223.71, z: 46.55 },
    ]),
  ],
  copies: [],
};

const m2: ModelArchive = {
  id: "md_t0204",
  unit: "T0204",
  layer: "H12灰坑",
  title: "T0204 · H12灰坑",
  controlPoints: ["K07", "K08"],
  createdAt: "2026-04-02",
  currentVersionId: "ver_m2_v11",
  versions: [
    v("ver_m2_v10", "v1.0", "2026-04-05", "灰坑初扫，坑口轮廓", [
      { name: "K07A", x: 386010.5, y: 4101002.22, z: 48.1 },
      { name: "K07B", x: 386014.88, y: 4101006.65, z: 48.25 },
    ]),
    v("ver_m2_v11", "v1.1", "2026-05-16", "补扫坑底堆积，新增控制点 K07C", [
      { name: "K07A", x: 386010.5, y: 4101002.22, z: 48.1 },
      { name: "K07B", x: 386014.88, y: 4101006.65, z: 48.25 },
      { name: "K07C", x: 386008.02, y: 4101009.3, z: 48.18 },
    ]),
  ],
  copies: [],
};

const m3: ModelArchive = {
  id: "md_t0301",
  unit: "T0301",
  layer: "F2房址",
  title: "T0301 · F2房址",
  controlPoints: ["K11"],
  createdAt: "2026-04-20",
  // v1.1 曾在借出期间入库，归还时已回退恢复到借出前版本 v1.0
  currentVersionId: "ver_m3_v10",
  versions: [
    v("ver_m3_v10", "v1.0", "2026-04-25", "房址夯土面扫描（借出前封存版本）", [
      { name: "F2-1", x: 390112.4, y: 4105520.1, z: 50.02 },
      { name: "F2-2", x: 390118.9, y: 4105524.66, z: 50.1 },
    ]),
    v("ver_m3_v11", "v1.1", "2026-05-22", "借出期间资料室补录的柱洞复核点", [
      { name: "F2-1", x: 390112.4, y: 4105520.1, z: 50.02 },
      { name: "F2-2", x: 390118.9, y: 4105524.66, z: 50.1 },
      { name: "F2-3", x: 390122.15, y: 4105518.32, z: 50.06 },
    ]),
  ],
  copies: [],
};

const m4: ModelArchive = {
  id: "md_t0302",
  unit: "T0302",
  layer: "G3沟状遗迹",
  title: "T0302 · G3沟状遗迹",
  controlPoints: ["K15"],
  createdAt: "2026-06-11",
  currentVersionId: "ver_m4_v1",
  versions: [
    v("ver_m4_v1", "v1.0", "2026-06-14", "沟状遗迹剖面扫描", [
      { name: "G3-1", x: 387540.66, y: 4099870.2, z: 44.3 },
      { name: "G3-2", x: 387548.21, y: 4099876.58, z: 44.42 },
    ]),
  ],
  copies: [],
};

// 为历史借出补建脱敏副本（日期按实际借出日回填）
const copyActive = buildDesensitizedCopy(m1, m1.versions[0]);

const copyOverdue = buildDesensitizedCopy(
  m2,
  m2.versions.find((x) => x.id === "ver_m2_v11")!
);
copyOverdue.createdAt = "2026-07-20";
copyOverdue.code = "T0204-H12灰坑-v1.1-脱敏-260720";

const copyReturned = buildDesensitizedCopy(
  m3,
  m3.versions.find((x) => x.id === "ver_m3_v10")!
);
copyReturned.createdAt = "2026-05-10";
copyReturned.code = "T0301-F2房址-v1.0-脱敏-260510";

m1.copies = [copyActive];
m2.copies = [copyOverdue];
m3.copies = [copyReturned];

export function buildSeedState(): DeskState {
  return {
    models: [m1, m2, m3, m4],
    loans: [
      {
        id: "ln_seed_active",
        modelId: m1.id,
        sourceVersionId: "ver_m1_v1",
        sourceVersionLabel: "v1.0",
        org: "省文物考古研究院合作室",
        purpose: "遗址聚落形态对比研究",
        custodian: "周岚",
        lentAt: "2026-09-18",
        dueDate: "2026-10-15",
        copyId: copyActive.id,
        status: "active",
      },
      {
        id: "ln_seed_overdue",
        modelId: m2.id,
        sourceVersionId: "ver_m2_v11",
        sourceVersionLabel: "v1.1",
        org: "高校数字考古实验室",
        purpose: "灰坑三维建模教学演示",
        custodian: "李慎",
        lentAt: "2026-07-20",
        dueDate: "2026-08-31",
        copyId: copyOverdue.id,
        status: "active",
      },
      {
        id: "ln_seed_returned",
        modelId: m3.id,
        sourceVersionId: "ver_m3_v10",
        sourceVersionLabel: "v1.0",
        org: "古建保护研究所",
        purpose: "夯土工艺无损检测",
        custodian: "王敏",
        lentAt: "2026-05-10",
        dueDate: "2026-06-05",
        returnedAt: "2026-06-02",
        copyId: copyReturned.id,
        status: "returned",
        returnNote: "副本介质已当面销毁，模型回传核对无误",
        restoredVersionId: "ver_m3_v10",
        result:
          "已于 2026-06-02 归还；模型从「v1.1」恢复为借出前版本「v1.0」，" +
          "借出的脱敏副本（T0301-F2房址-v1.0-脱敏-260510）不予归档精确坐标。 " +
          "归还备注：副本介质已当面销毁，模型回传核对无误",
      },
    ],
  };
}
