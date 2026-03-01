# Canvas Table Component

高性能 Vue 3 + TypeScript Canvas 表格组件，支持大数据量展示与深度定制交互。

## 🚀 特性

- **Canvas 渲染**：高性能大数据虚拟滚动。
- **多种单元格**：内置图片、开关、标签、单选/多选框、颜色选择器等。
- **行内编辑**：支持点击编辑图标或双击唤起自定义弹窗。
- **高级布局**：支持左侧固定列、单元格合并 (`spanMethod`)。
- **交互功能**：第一列点击展开详情、单选/多选行。
- **底部汇总**：每列支持多个聚合函数计算汇总行。

## 📦 安装

目前作为源码集成在项目中，主要文件位于 `src/table` 目录下。

## 🛠 使用方式

### 1. 基础用法

```vue
<script setup lang="ts">
import CanvasTable from './table/components/CanvasTable.vue';
import { ref, h } from 'vue';

const columns = [
  { key: 'id', title: 'ID', type: 'text', width: 60, fixed: 'left' },
  { 
    key: 'name', 
    title: 'Name', 
    type: 'text', 
    width: 150,
    renderEdit: (data, h) => h('div', '编辑姓名...')
  },
  { key: 'status', title: 'Active', type: 'switch', width: 100 },
];

const data = ref([
  { id: 1, name: 'User 1', status: true },
  // ... 更多数据
]);
</script>

<template>
  <CanvasTable :columns="columns" :data="data" />
</template>
```

### 2. ColumnConfig 配置项

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `key` | `string` | 数据字段名 |
| `title` | `string` | 表头文字 |
| `type` | `CellType` | 单元格类型 (`text`, `image`, `checkbox`, `radio`, `switch`, `color-picker`, `tags`, `expand`, `selection`) |
| `width` | `number` | 列宽 |
| `fixed` | `'left' | boolean` | 是否固定到左侧 |
| `summary` | `SummaryFunction[]` | 聚合函数数组，支持多行聚合 |
| `renderEdit` | `(data, h) => VNode` | 自定义编辑弹窗渲染逻辑 |

### 3. 特殊列类型

- **`selection`**: 勾选列。置于最左侧时支持全选/反选，自动同步行选中状态。
- **`expand`**: 展开列。专门用于放置展开/折叠按钮。

### 3. TableOptions 选项

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `border` | `boolean` | 是否显示边框 |
| `stripe` | `boolean` | 是否显示斑马线 |
| `multiSelect` | `boolean` | 是否支持多选 |
| `renderExpand` | `(row, h) => VNode` | 展开行自定义内容渲染 |
| `spanMethod` | `Function` | 合并行或列的方法 |

## 🧩 开发者指南

- **自定义单元格绘制**：修改 `src/table/core/renderer.ts` 中的 `drawCell` 方法。
- **样式定制**：编辑 `src/table/components/CanvasTable.vue` 中的 CSS 变量。
- **交互逻辑**：调整 `src/table/components/CanvasTable.vue` 中的事件监听器。

## ⚠️ 注意事项

- **Node 版本**：建议使用 Node 16+ 以获得最佳工具链支持。
- **浏览器支持**：需要支持 Canvas 2D 的现代浏览器。
