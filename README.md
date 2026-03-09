# draw-table-vue

高性能 Vue 3 + TypeScript Canvas 表格组件，支持大数据量展示与深度定制交互。

## 🚀 特性

- **Canvas 渲染**：基于 Canvas 2D 的高性能渲染，轻松处理十万级数据
- **虚拟滚动**：内置虚拟滚动机制，大数据量下依然流畅
- **多种单元格类型**：内置文本、图片、开关、标签、单选/多选框、颜色选择器等
- **多级表头**：支持复杂的多级表头结构
- **行内编辑**：支持点击编辑图标或双击唤起自定义编辑弹窗
- **固定列**：支持左侧列固定，滚动时保持可见
- **行展开**：支持点击展开行详情，自定义展开内容
- **行选择**：支持单选/多选行，内置全选/反选功能
- **单元格合并**：通过 `spanMethod` 实现灵活的单元格合并
- **底部汇总**：每列支持配置多个聚合函数计算汇总行
- **表头菜单**：支持自定义表头右键菜单

## 📦 安装

```bash
# npm
npm install draw-table-vue

# yarn
yarn add draw-table-vue

# pnpm
pnpm add draw-table-vue
```

## 🛠 快速开始

### 1. 全局注册

```ts
import { createApp } from 'vue';
import { CanvasTable } from 'draw-table-vue';
import 'draw-table-vue/dist/style.css';

const app = createApp(App);
app.component('CanvasTable', CanvasTable);
app.mount('#app');
```

### 2. 局部引入

```vue
<script setup lang="ts">
import { CanvasTable } from 'draw-table-vue';
import 'draw-table-vue/dist/style.css';
import { ref } from 'vue';

const columns = [
  { key: 'id', title: 'ID', type: 'text', width: 80 },
  { key: 'name', title: '姓名', type: 'text', width: 150 },
  { key: 'age', title: '年龄', type: 'text', width: 100 },
];

const data = ref([
  { id: 1, name: '张三', age: 25 },
  { id: 2, name: '李四', age: 30 },
  { id: 3, name: '王五', age: 28 },
]);
</script>

<template>
  <CanvasTable :columns="columns" :data="data" style="height: 400px" />
</template>
```

## 📖 详细使用指南

### 基础表格

最简单的表格使用方式：

```vue
<script setup lang="ts">
import { CanvasTable } from 'draw-table-vue';
import { ref } from 'vue';
import type { ColumnConfig } from 'draw-table-vue';

const columns: ColumnConfig[] = [
  { key: 'id', title: 'ID', type: 'text', width: 80 },
  { key: 'name', title: '姓名', type: 'text', width: 150 },
  { key: 'department', title: '部门', type: 'text', width: 120 },
  { key: 'position', title: '职位', type: 'text', width: 150 },
  { key: 'salary', title: '薪资', type: 'text', width: 100, align: 'right' },
];

const data = ref([
  { id: 1, name: '张三', department: '技术部', position: '前端工程师', salary: '15k' },
  { id: 2, name: '李四', department: '产品部', position: '产品经理', salary: '20k' },
  { id: 3, name: '王五', department: '设计部', position: 'UI设计师', salary: '18k' },
]);
</script>

<template>
  <CanvasTable :columns="columns" :data="data" style="height: 400px" />
</template>
```

### 单元格类型详解

#### 文本类型 (text)

```ts
{ key: 'name', title: '姓名', type: 'text', width: 150 }
```

#### 图片类型 (image)

```ts
{ key: 'avatar', title: '头像', type: 'image', width: 80 }
```

数据格式：
```ts
{ id: 1, avatar: 'https://example.com/avatar.png' }
```

#### 开关类型 (switch)

```ts
{ key: 'status', title: '状态', type: 'switch', width: 100 }
```

数据格式：
```ts
{ id: 1, status: true }  // boolean 类型
```

#### 标签类型 (tags)

```ts
{ key: 'tags', title: '标签', type: 'tags', width: 150 }
```

数据格式：
```ts
{ id: 1, tags: ['重要', '紧急'] }  // string[] 类型
```

#### 颜色选择器 (color-picker)

```ts
{ key: 'theme', title: '主题色', type: 'color-picker', width: 100 }
```

数据格式：
```ts
{ id: 1, theme: '#409eff' }  // 颜色字符串
```

#### 复选框 (checkbox)

```ts
{ key: 'agree', title: '同意', type: 'checkbox', width: 80 }
```

#### 单选框 (radio)

```ts
{ key: 'selected', title: '选择', type: 'radio', width: 80 }
```

#### 序号列 (index)

```ts
{ title: '序号', type: 'index', width: 60 }
```

### 固定列

通过设置 `fixed: 'left'` 将列固定在左侧：

```ts
const columns: ColumnConfig[] = [
  { key: 'id', title: 'ID', type: 'text', width: 80, fixed: 'left' },
  { key: 'name', title: '姓名', type: 'text', width: 150, fixed: 'left' },
  { key: 'description', title: '详细描述', type: 'text', width: 500 },
  { key: 'createTime', title: '创建时间', type: 'text', width: 180 },
  { key: 'operation', title: '操作', type: 'text', width: 120, fixed: 'right' },
];
```

### 多级表头

通过 `children` 属性配置多级表头：

```ts
const columns: ColumnConfig[] = [
  { key: 'id', title: 'ID', type: 'text', width: 80, fixed: 'left' },
  {
    title: '基本信息',
    children: [
      { key: 'name', title: '姓名', type: 'text', width: 100 },
      { key: 'age', title: '年龄', type: 'text', width: 80 },
    ]
  },
  {
    title: '工作信息',
    children: [
      { key: 'department', title: '部门', type: 'text', width: 120 },
      { key: 'position', title: '职位', type: 'text', width: 150 },
      { key: 'salary', title: '薪资', type: 'text', width: 100 },
    ]
  },
];
```

### 行选择功能

#### 多选模式

```vue
<script setup lang="ts">
import { CanvasTable } from 'draw-table-vue';
import { ref, h } from 'vue';
import type { ColumnConfig, TableOptions, TableRow } from 'draw-table-vue';

const columns: ColumnConfig[] = [
  { type: 'selection', width: 50, fixed: 'left' },  // 选择列
  { key: 'id', title: 'ID', type: 'text', width: 80 },
  { key: 'name', title: '姓名', type: 'text', width: 150 },
];

const data = ref([
  { id: 1, name: '张三' },
  { id: 2, name: '李四' },
  { id: 3, name: '王五' },
]);

const options: TableOptions = {
  multiSelect: true,  // 启用多选
};

const handleSelectChange = (selectedIds: (string | number)[]) => {
  console.log('选中行:', selectedIds);
};
</script>

<template>
  <CanvasTable 
    :columns="columns" 
    :data="data" 
    :options="options"
    @select-change="handleSelectChange"
    style="height: 400px" 
  />
</template>
```

### 行展开功能

```vue
<script setup lang="ts">
import { CanvasTable } from 'draw-table-vue';
import { ref, h } from 'vue';
import type { ColumnConfig, TableOptions, TableRow } from 'draw-table-vue';

const columns: ColumnConfig[] = [
  { type: 'expand', width: 50, fixed: 'left' },  // 展开列
  { key: 'id', title: 'ID', type: 'text', width: 80 },
  { key: 'name', title: '姓名', type: 'text', width: 150 },
];

const data = ref([
  { id: 1, name: '张三', detail: '这是张三的详细信息...' },
  { id: 2, name: '李四', detail: '这是李四的详细信息...' },
]);

const options: TableOptions = {
  renderExpand: (row: TableRow, h) => {
    return h('div', { style: 'padding: 16px; background: #f5f7fa;' }, [
      h('h4', '详细信息'),
      h('p', row.detail),
    ]);
  },
};
</script>

<template>
  <CanvasTable 
    :columns="columns" 
    :data="data" 
    :options="options"
    style="height: 400px" 
  />
</template>
```

### 行内编辑

通过 `renderEdit` 实现自定义编辑弹窗：

```vue
<script setup lang="ts">
import { CanvasTable } from 'draw-table-vue';
import { ref, h } from 'vue';
import type { ColumnConfig } from 'draw-table-vue';

const columns: ColumnConfig[] = [
  { key: 'id', title: 'ID', type: 'text', width: 80 },
  { 
    key: 'name', 
    title: '姓名', 
    type: 'text', 
    width: 150,
    renderEdit: (data, h) => {
      return h('input', {
        value: data.name,
        onInput: (e: Event) => { data.name = (e.target as HTMLInputElement).value; },
        style: 'width: 100%; padding: 8px; border: 1px solid #dcdfe6; border-radius: 4px;'
      });
    }
  },
  { 
    key: 'status', 
    title: '状态', 
    type: 'switch', 
    width: 100,
    renderEdit: (data, h) => {
      return h('select', {
        value: data.status ? 'active' : 'inactive',
        onChange: (e: Event) => { data.status = (e.target as HTMLSelectElement).value === 'active'; },
        style: 'width: 100%; padding: 8px;'
      }, [
        h('option', { value: 'active' }, '启用'),
        h('option', { value: 'inactive' }, '禁用'),
      ]);
    }
  },
];

const data = ref([
  { id: 1, name: '张三', status: true },
  { id: 2, name: '李四', status: false },
]);
</script>

<template>
  <CanvasTable :columns="columns" :data="data" style="height: 400px" />
</template>
```

编辑触发方式：
- 点击单元格上的编辑图标
- 双击单元格

### 单元格合并

通过 `spanMethod` 实现单元格合并：

```vue
<script setup lang="ts">
import { CanvasTable } from 'draw-table-vue';
import { ref } from 'vue';
import type { ColumnConfig, TableOptions } from 'draw-table-vue';

const columns: ColumnConfig[] = [
  { key: 'category', title: '分类', type: 'text', width: 120 },
  { key: 'product', title: '产品', type: 'text', width: 150 },
  { key: 'sales', title: '销量', type: 'text', width: 100 },
];

const data = ref([
  { id: 1, category: '电子产品', product: '手机', sales: 100 },
  { id: 2, category: '电子产品', product: '电脑', sales: 80 },
  { id: 3, category: '服装', product: 'T恤', sales: 200 },
  { id: 4, category: '服装', product: '裤子', sales: 150 },
]);

const options: TableOptions = {
  spanMethod: ({ row, column, rowIndex, columnIndex }) => {
    // 合并第一列中相同的分类
    if (columnIndex === 0) {
      if (rowIndex === 0 || data.value[rowIndex].category !== data.value[rowIndex - 1].category) {
        // 计算需要合并的行数
        let rowspan = 1;
        for (let i = rowIndex + 1; i < data.value.length; i++) {
          if (data.value[i].category === row.category) {
            rowspan++;
          } else {
            break;
          }
        }
        return { rowspan, colspan: 1 };
      } else {
        return { rowspan: 0, colspan: 0 };  // 被合并的单元格
      }
    }
    return undefined;  // 不合并
  },
};
</script>

<template>
  <CanvasTable 
    :columns="columns" 
    :data="data" 
    :options="options"
    style="height: 400px" 
  />
</template>
```

### 底部汇总行

通过 `summary` 配置列的汇总计算：

```vue
<script setup lang="ts">
import { CanvasTable } from 'draw-table-vue';
import { ref } from 'vue';
import type { ColumnConfig, SummaryFunction } from 'draw-table-vue';

// 自定义汇总函数
const sum: SummaryFunction = (data) => {
  const value = data.reduce((sum, item) => sum + (Number(item.sales) || 0), 0);
  return { label: '合计', value: value.toString() };
};

const avg: SummaryFunction = (data) => {
  const value = data.reduce((sum, item) => sum + (Number(item.score) || 0), 0) / data.length;
  return { label: '平均', value: value.toFixed(2) };
};

const columns: ColumnConfig[] = [
  { key: 'id', title: 'ID', type: 'text', width: 80 },
  { key: 'name', title: '姓名', type: 'text', width: 150 },
  { 
    key: 'sales', 
    title: '销量', 
    type: 'text', 
    width: 100,
    summary: [sum]  // 配置汇总函数
  },
  { 
    key: 'score', 
    title: '评分', 
    type: 'text', 
    width: 100,
    summary: [avg]
  },
];

const data = ref([
  { id: 1, name: '张三', sales: 100, score: 85 },
  { id: 2, name: '李四', sales: 150, score: 90 },
  { id: 3, name: '王五', sales: 80, score: 78 },
]);
</script>

<template>
  <CanvasTable :columns="columns" :data="data" style="height: 400px" />
</template>
```

### 表头菜单

通过 `renderHeaderMenu` 自定义表头右键菜单：

```ts
const columns: ColumnConfig[] = [
  { 
    key: 'name', 
    title: '姓名', 
    type: 'text', 
    width: 150,
    renderHeaderMenu: (column, defaultMenu) => {
      return [
        ...defaultMenu,
        { 
          label: '升序排序', 
          icon: '↑',
          onCommand: (col) => {
            console.log('升序排序', col);
          } 
        },
        { 
          label: '降序排序', 
          icon: '↓',
          onCommand: (col) => {
            console.log('降序排序', col);
          } 
        },
        { 
          label: '隐藏列', 
          icon: '✕',
          onCommand: (col) => {
            console.log('隐藏列', col);
          } 
        },
      ];
    }
  },
];
```

### 自定义单元格渲染

通过 `renderCell` 实现完全自定义的单元格内容：

```ts
const columns: ColumnConfig[] = [
  { 
    key: 'progress', 
    title: '进度', 
    type: 'text', 
    width: 150,
    renderCell: (row, column, h) => {
      const progress = row.progress || 0;
      return h('div', {
        style: `
          width: 100%;
          height: 20px;
          background: #e4e7ed;
          border-radius: 10px;
          overflow: hidden;
        `
      }, [
        h('div', {
          style: `
            width: ${progress}%;
            height: 100%;
            background: #409eff;
            transition: width 0.3s;
          `
        })
      ]);
    }
  },
];
```

### 自定义表头渲染

通过 `renderHeader` 自定义表头内容：

```ts
const columns: ColumnConfig[] = [
  { 
    key: 'name', 
    title: '姓名', 
    type: 'text', 
    width: 150,
    renderHeader: (column, h) => {
      return h('div', { style: 'display: flex; align-items: center; gap: 4px;' }, [
        h('span', column.title),
        h('span', { style: 'color: #f56c6c;' }, '*'),
        h('i', { 
          class: 'icon-info',
          title: '必填项'
        }, 'ⓘ')
      ]);
    }
  },
];
```

### 表格样式配置

```vue
<script setup lang="ts">
import { CanvasTable } from 'draw-table-vue';
import { ref } from 'vue';
import type { TableOptions } from 'draw-table-vue';

const options: TableOptions = {
  border: true,        // 显示边框
  stripe: true,        // 显示斑马纹
  fixedHeader: true,   // 固定表头
  rowHeight: 48,       // 行高
  headerHeight: 48,    // 表头高度
};
</script>
```

### 大数据量示例

```vue
<script setup lang="ts">
import { CanvasTable } from 'draw-table-vue';
import { ref } from 'vue';
import type { ColumnConfig } from 'draw-table-vue';

const columns: ColumnConfig[] = [
  { type: 'selection', width: 50, fixed: 'left' },
  { key: 'id', title: 'ID', type: 'text', width: 80, fixed: 'left' },
  { key: 'name', title: '姓名', type: 'text', width: 120 },
  { key: 'email', title: '邮箱', type: 'text', width: 200 },
  { key: 'phone', title: '电话', type: 'text', width: 150 },
  { key: 'address', title: '地址', type: 'text', width: 300 },
  { key: 'company', title: '公司', type: 'text', width: 180 },
  { key: 'department', title: '部门', type: 'text', width: 120 },
  { key: 'position', title: '职位', type: 'text', width: 150 },
  { key: 'salary', title: '薪资', type: 'text', width: 100, align: 'right' },
  { key: 'status', title: '状态', type: 'switch', width: 100 },
  { key: 'tags', title: '标签', type: 'tags', width: 150 },
  { key: 'createTime', title: '创建时间', type: 'text', width: 180 },
];

// 生成10万条测试数据
const generateData = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `用户${i + 1}`,
    email: `user${i + 1}@example.com`,
    phone: `138${String(i).padStart(8, '0')}`,
    address: `北京市朝阳区${i + 1}号`,
    company: `公司${(i % 100) + 1}`,
    department: ['技术部', '产品部', '设计部', '运营部'][i % 4],
    position: ['工程师', '经理', '专员', '总监'][i % 4],
    salary: `${(i % 50 + 10)}k`,
    status: i % 2 === 0,
    tags: ['重要', '紧急'].slice(0, i % 3),
    createTime: new Date(Date.now() - i * 86400000).toLocaleString(),
  }));
};

const data = ref(generateData(100000));
</script>

<template>
  <CanvasTable 
    :columns="columns" 
    :data="data" 
    style="height: 600px"
  />
</template>
```

## 📘 API 参考

### CanvasTable Props

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `columns` | `ColumnConfig[]` | `[]` | 列配置数组 |
| `data` | `TableRow[]` | `[]` | 表格数据 |
| `options` | `TableOptions` | `{}` | 表格选项 |

### CanvasTable Events

| 事件名 | 参数 | 说明 |
|--------|------|------|
| `select-change` | `(selectedIds: (string \| number)[])` | 行选择变化时触发 |
| `update:data` | `(newData: TableRow[])` | 数据更新时触发（行内编辑保存后） |
| `header-command` | `(command: string, column: ColumnConfig)` | 表头菜单命令触发 |

### ColumnConfig

| 属性 | 类型 | 说明 |
|------|------|------|
| `key` | `string` | 数据字段名 |
| `title` | `string` | 表头标题 |
| `type` | `CellType` | 单元格类型 |
| `width` | `number` | 列宽（像素） |
| `fixed` | `'left' \| 'right' \| boolean` | 是否固定列 |
| `align` | `'left' \| 'center' \| 'right'` | 文本对齐方式 |
| `children` | `ColumnConfig[]` | 子列配置（用于多级表头） |
| `summary` | `SummaryFunction[]` | 汇总函数数组 |
| `renderEdit` | `Function` | 自定义编辑渲染函数 |
| `renderCell` | `Function` | 自定义单元格渲染函数 |
| `renderHeader` | `Function` | 自定义表头渲染函数 |
| `renderHeaderMenu` | `Function` | 自定义表头菜单 |

### CellType

```ts
type CellType = 
  | 'text'        // 文本
  | 'image'       // 图片
  | 'checkbox'    // 复选框
  | 'radio'       // 单选框
  | 'switch'      // 开关
  | 'color-picker' // 颜色选择器
  | 'tags'        // 标签
  | 'expand'      // 展开按钮
  | 'selection'   // 选择列
  | 'index';      // 序号列
```

### TableOptions

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `border` | `boolean` | `false` | 是否显示边框 |
| `stripe` | `boolean` | `false` | 是否显示斑马纹 |
| `multiSelect` | `boolean` | `false` | 是否支持多选 |
| `fixedHeader` | `boolean` | `true` | 是否固定表头 |
| `rowHeight` | `number` | `40` | 行高（像素） |
| `headerHeight` | `number` | `48` | 表头高度（像素） |
| `renderExpand` | `Function` | - | 展开行内容渲染函数 |
| `spanMethod` | `Function` | - | 单元格合并方法 |

### TableRow

```ts
interface TableRow {
  id: string | number;    // 唯一标识（必需）
  [key: string]: any;     // 其他数据字段
  _expanded?: boolean;    // 是否展开（内部使用）
  _selected?: boolean;    // 是否选中（内部使用）
}
```

## 🏗 项目结构

```
draw-table/
├── src/
│   └── table/
│       ├── components/
│       │   ├── CanvasTable.vue    # 主表格组件
│       │   └── TableHeader.vue    # 表头组件
│       ├── core/
│       │   └── renderer.ts        # Canvas 渲染核心
│       ├── types/
│       │   └── index.ts           # TypeScript 类型定义
│       └── utils/                 # 工具函数
├── dist/                          # 构建输出
├── docs/
│   └── DESIGN.md                  # 设计文档
└── README.md                      # 本文档
```

## 🧩 浏览器兼容性

- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

需要支持 Canvas 2D API 的现代浏览器。

## 📄 许可证

[MIT](LICENSE)
