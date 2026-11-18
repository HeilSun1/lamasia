# 全站巡检（只读） 2026-11-18

页面 17 个，问题 20 条。

## 中（20）

| 页面 | 类型 | 明细 |
|---|---|---|
| formation.html | 硬编码日期 | 2026-05-23 |
| index.html | 赛季字样混用 | 2025-26 / 2026-27 |
| teams/barca-atletic.html | 赛季字样混用 | 2026-27 / 2025-26 |
| teams/cadete-b.html | 硬编码日期 | 2026-09-12 |
| teams/cadete-b.html | 赛季字样混用 | 2026-27 / 2025-26 |
| teams/cadete.html | 硬编码日期 | 2026-09-21 |
| teams/cadete.html | 赛季字样混用 | 2025-26 / 2026-27 |
| teams/infantil-b.html | 硬编码日期 | 2026-09-12 |
| teams/infantil-c.html | 硬编码日期 | 2026-09-12 |
| teams/infantil-c.html | 硬编码日期 | 2026-07-03 |
| teams/infantil.html | 硬编码日期 | 2026-09-12 |
| teams/infantil.html | 赛季字样混用 | 2026-27 / 2025-26 |
| teams/juvenil-a.html | 硬编码日期 | 2026-08-06 |
| teams/juvenil-a.html | 硬编码日期 | 2026-11-17 |
| teams/juvenil-a.html | 赛季字样混用 | 2025-26 / 2026-27 |
| teams/juvenil-b.html | 硬编码日期 | 2027-05-15 |
| teams/juvenil-b.html | 硬编码日期 | 2026-08-06 |
| teams/juvenil-b.html | 硬编码日期 | 2026-09-21 |
| teams/juvenil-b.html | 赛季字样混用 | 2025-26 / 2026-27 |
| teams/seven-a-side.html | 硬编码日期 | 2026-09-12 |
## 人工核查补充（脚本查不出来的）

### 结构不一致：梯队页该有的区块

| 页面 | 位置分布 | 大名单 | 赛程 | 球队信息 | 球队资讯 |
|---|---|---|---|---|---|
| juvenil-a / juvenil-b / cadete | 有 | 有 | 有 | 有 | 有 |
| cadete-b / infantil / infantil-b / infantil-c | 有 | 有 | 有 | 有 | **无** |
| barca-atletic | **无** | 有 | 有 | 有 | 有 |
| seven-a-side | 无 | 无 | 无 | 无 | 无（多队总览页，可接受） |

- **B 队页没有「阵容位置分布」**：30 人的队反而是唯一没有位置分布的梯队页，而 22 人的 Juvenil A 有。
- **4 个低龄梯队页没有「球队资讯」区**：同为梯队页，Sofascore 与懂球帝都有内容可放，缺一块会显得页面短一截。

### 文案陈旧

- `teams/juvenil-a.html:93` 与 `teams/juvenil-b.html:91` 的「2026-27 赛季变动」面板写死 **截至 2026-08-06**，距今三个多月未更新（名单已于 11-17 重建）。

### 硬编码日期逐条核对结果

脚本报的 20 条「硬编码日期 / 赛季混用」逐条看过上下文，**18 条是合理文案**（如「官方名单图（2026-09-12 整理）」「2025-26 赛季战绩」），只有上面那两条「截至 2026-08-06」是真的过期。

### 未覆盖部分（本轮未查）

- `assets/js/match-detail.js`（56.9K，比赛详情弹窗）—— 只做了静态引用检查，没做交互验证
- 移动端全量（只有个别页面看过 390 宽）
- `scripts/` 下 30+ 个抓取脚本的运行期行为（如「抓空就覆盖」这类，已知 2 处）