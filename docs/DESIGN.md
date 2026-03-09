# Canvas 表格组件设计文档

## 目录

1. [核心架构](#1-核心架构)
2. [类型系统](#2-类型系统)
3. [核心功能实现](#3-核心功能实现)
4. [性能优化](#4-性能优化)
5. [交互设计](#5-交互设计)
6. [扩展性设计](#6-扩展性设计)
7. [使用示例](#7-使用示例)

---

## 1. 核心架构

本组件采用 **Canvas 渲染引擎 + Vue 状态管理 + DOM 表头** 的混合架构，旨在解决大数据量下 DOM 渲染性能瓶颈，同时保持灵活的交互能力。

### 1.1 整体架构图

```
┌─────────────────────────────────────────────────┐
│           CanvasTable.vue (Vue 容器)             │
│  ┌───────────────────────────────────────────┐  │
│  │      TableHeader.vue (DOM 表头)            │  │
│  │  - 多级表头支持                            │  │
│  │  - 菜单和交互                              │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │        Canvas Wrapper (画布容器)           │  │
│  │  ┌─────────────────────────────────────┐  │  │
│  │  │   CanvasRenderer (Canvas 渲染引擎)   │  │  │
│  │  │   - 虚拟滚动                         │  │  │
│  │  │   - 单元格绘制                       │  │  │
│  │  │   - 固定列/行                        │  │  │
│  │  └─────────────────────────────────────┘  │  │
│  │  - 滚动条                                  │  │
│  │  - 覆盖层（编辑框、菜单等）                │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### 1.2 CanvasRenderer (渲染引擎)

**职责**：负责表格的所有图形绘制，包括单元格、表头、固定列、固定行、聚合行等。

**核心特性**：

- **虚拟滚动**：基于 `scrollY` 和 `scrollX` 计算可见区域的行和列，仅绘制可视内容
- **布局引擎**：维护 `columnPositions` 和 `rowOffsets`，支持动态行高（如展开行）
- **坐标映射**：提供 `getCellAt(x, y)` 方法，将屏幕坐标映射到数据模型
- **内存优化**：实现 `imageCache` 机制，通过 `Map` 缓存已加载的图片对象，并在组件卸载时显式销毁资源

**关键方法**：

```typescript
// 设置数据和配置
setColumns(columns: ColumnConfig[]): void
setData(data: TableRow[]): void
setOptions(options: Partial<TableOptions>): void

// 渲染控制
render(): void
resize(width: number, height: number): void
scrollTo(x: number, y: number): void

// 查询方法
getCellAt(x: number, y: number): CellInfo | null
getRowOffsets(): number[]
getTotalWidth(): number
getTotalHeight(): number
```

### 1.3 CanvasTable.vue (Vue 容器)

**职责**：管理 Canvas 生命周期、同步原生滚动条、维护覆盖层（编辑弹窗、按钮、展开内容）。

**核心功能**：

- **状态管理**：维护选中行、展开行、悬浮单元格、编辑单元格等状态
- **事件处理**：处理鼠标移动、点击、双击、滚轮等事件
- **覆盖层系统**：利用 `Teleport` 将弹窗挂载到 `body`，解决层级冲突
- **响应式布局**：使用 `ResizeObserver` 监听容器尺寸变化

### 1.4 TableHeader.vue (DOM 表头)

**职责**：渲染多级表头，提供丰富的交互功能。

**设计思想**：

- **分离渲染**：表头使用 DOM 渲染，便于实现复杂的交互（菜单、排序、拖拽等）
- **绝对定位布局**：每个单元格独立定位，支持跨度和固定列
- **层级管理**：按层级分组渲染，支持多级表头

---

## 2. 类型系统

### 2.1 单元格类型 (CellType)

```typescript
type CellType = 
  | 'text'          // 文本
  | 'image'         // 图片
  | 'checkbox'      // 复选框
  | 'radio'         // 单选框
  | 'switch'        // 开关
  | 'color-picker'  // 颜色选择器
  | 'tags'          // 标签组
  | 'expand'        // 展开按钮
  | 'selection'     // 选择框
  | 'index';        // 序号
```

### 2.2 列配置 (ColumnConfig)

```typescript
interface ColumnConfig {
  key?: string;                                    // 数据字段键名
  title: string;                                   // 表头标题
  type?: CellType;                                 // 单元格类型
  width?: number;                                  // 列宽
  fixed?: 'left' | 'right' | boolean;              // 固定列
  align?: 'left' | 'center' | 'right';            // 对齐方式
  renderEdit?: (data: any, h: Function) => VNode;  // 编辑渲染器
  renderHeaderMenu?: Function;                     // 表头菜单自定义
  summary?: SummaryFunction[];                     // 汇总函数
  renderHeader?: Function;                         // 表头自定义渲染
  renderCell?: Function;                           // 单元格自定义渲染
  children?: ColumnConfig[];                       // 子列（多级表头）
}
```

### 2.3 表格选项 (TableOptions)

```typescript
interface TableOptions {
  border?: boolean;         // 边框
  stripe?: boolean;         // 斑马线
  multiSelect?: boolean;    // 多选
  fixedHeader?: boolean;    // 固定表头
  rowHeight?: number;       // 行高
  headerHeight?: number;    // 表头高度
  renderExpand?: Function;  // 展开内容渲染
  spanMethod?: Function;    // 合并单元格函数
}
```

---

## 3. 核心功能实现

### 3.1 虚拟滚动

**实现原理**：

1. **计算可见区域**：根据滚动位置和视口高度，计算需要绘制的行范围
2. **按需绘制**：只绘制可见区域内的单元格，避免无效渲染
3. **缓冲区**：额外绘制上下几行，防止滚动时出现空白

```typescript
private getRowRange(rowspanOffset = 20) {
  const { headerHeight } = this.options;
  const summaryHeight = this.summaryRows.length * this.options.rowHeight;
  
  // 可见区域高度
  const visibleBodyHeight = this.height - headerHeight - summaryHeight;
  
  const startY = this.scrollY;
  const endY = startY + visibleBodyHeight;

  // 查找起始行和结束行
  let startRow = 0;
  while (startRow < this.rowOffsets.length && 
         (this.rowOffsets[startRow + 1] ?? 0) < startY) {
    startRow++;
  }

  let endRow = startRow;
  while (endRow < this.rowOffsets.length && 
         (this.rowOffsets[endRow] ?? 0) < endY) {
    endRow++;
  }

  return {
    startRow: Math.max(0, startRow - rowspanOffset),
    endRow: Math.min(this.data.length, endRow + 1)
  };
}
```

### 3.2 固定列

**实现原理**：

1. **分区绘制**：将表格分为滚动区域和固定区域分别绘制
2. **裁剪路径**：使用 Canvas 的 `clip()` 方法限制绘制区域
3. **位置计算**：固定列不受 `scrollX` 影响

```typescript
// 绘制固定左侧区域
private drawFixedLeftBody() {
  this.ctx.save();
  this.ctx.beginPath();
  this.ctx.rect(0, headerHeight, this.fixedLeftWidth, 
                this.height - headerHeight - summaryHeight);
  this.ctx.clip();

  // 绘制固定列（不使用 scrollX）
  this.flattenedColumns.forEach((col, j) => {
    if (!(col.fixed === 'left' || col.fixed === true)) return;
    const x = this.columnPositions[j];  // 不使用 scrollX
    // ... 绘制逻辑
  });
  
  this.ctx.restore();
}
```

### 3.3 多级表头

**实现原理**：

1. **列扁平化**：将所有叶子节点列展平到一维数组
2. **层级计算**：记录每个列所在的层级
3. **跨度计算**：父级列宽度为所有子列宽度之和

```typescript
private flattenColumns() {
  this.flattenedColumns = [];
  this.columnLevels = 0;
  const flatten = (cols: ColumnConfig[], level = 0) => {
    this.columnLevels = Math.max(this.columnLevels, level + 1);
    cols.forEach(col => {
      if (col.children && col.children.length > 0) {
        flatten(col.children, level + 1);
      } else {
        this.flattenedColumns.push(col);
      }
    });
  };
  flatten(this.columns);
}
```

### 3.4 合并单元格

**实现原理**：

1. **跨度和偏移计算**：根据 `spanMethod` 计算合并后的宽高
2. **跳过被合并单元格**：使用 `processedCells` 集合记录已处理的单元格
3. **延迟绘制**：合并单元格最后绘制，确保在最上层

```typescript
const span = this.options.spanMethod({ row: i, column: col, 
                                       rowIndex: i, columnIndex: j });
if (span) {
  const { rowspan, colspan } = span;
  if (rowspan === 0 || colspan === 0) return;
  
  // 计算合并后的宽高
  const spanW = (this.columnPositions[j + colspan] ?? this.totalWidth) - 
                (this.columnPositions[j] ?? 0);
  const spanH = (this.rowOffsets[i + rowspan] ?? this.totalHeight) - 
                (this.rowOffsets[i] ?? 0);
  
  // 标记所有被合并的单元格
  for (let r = 0; r < rowspan; r++) {
    for (let c = 0; c < colspan; c++) {
      processedCells.add(`${i + r},${j + c}`);
    }
  }
  
  mergedCellsToDraw.push({ col, val: row[col.key || ''], 
                           x, y, w: spanW, h: spanH, r: i, c: j });
}
```

### 3.5 展开行

**实现原理**：

1. **高度计算**：展开行占用额外的行高空间
2. **区域划分**：主行显示基本信息，展开区域显示详细信息
3. **混合渲染**：Canvas 绘制背景/边框，DOM Overlay 渲染内容

```typescript
// Canvas 中只绘制背景和边框
if (this.expandedRowKeys.has(row.id)) {
  const expandY = y + this.options.rowHeight;
  const expandH = h - this.options.rowHeight;
  
  this.ctx.fillStyle = '#fdfdfd';
  this.ctx.fillRect(this.fixedLeftWidth, expandY, 
                    this.width - this.fixedLeftWidth, expandH);
  // 绘制边框...
}

// DOM Overlay 渲染实际内容（在 CanvasTable.vue 中）
<div v-for="rowId in expandedRows" :key="rowId"
     class="expand-row-overlay" :style="getExpandStyle(rowId)">
  <component :is="renderExpandContent(rowId)" />
</div>
```

### 3.6 汇总行

**实现原理**：

1. **数据聚合**：遍历所有列的 `summary` 函数，计算汇总结果
2. **底部固定**：汇总行固定在表格底部
3. **标签合并**：前几列合并显示汇总标签

```typescript
private calculateSummaries() {
  this.summaryRows = [];
  const rowsByLabel = new Map<string, any[]>();
  
  this.flattenedColumns.forEach((col, j) => {
    if (!col.summary) return;
    
    col.summary.forEach(summaryFn => {
      const result = summaryFn(this.data);
      if (result && result.label) {
        const { label, value } = result;
        if (!rowsByLabel.has(label)) {
          rowsByLabel.set(label, new Array(this.flattenedColumns.length).fill(''));
        }
        rowsByLabel.get(label)![j] = value;
      }
    });
  });

  rowsByLabel.forEach((rowData, label) => {
    rowData[0] = label;  // 第一列设为标签
    this.summaryRows.push(rowData);
  });
}
```

### 3.7 内置单元格渲染器

每种单元格类型都有独立的绘制方法：

```typescript
// 文本单元格
private drawTextCell(value: any, x: number, y: number, 
                     w: number, h: number, align?: string) {
  this.ctx.fillStyle = '#606266';
  this.ctx.font = '14px sans-serif';
  this.ctx.textAlign = (align as any) || 'left';
  this.ctx.textBaseline = 'middle';
  
  let textX = x + 10;
  if (align === 'center') textX = x + w / 2;
  if (align === 'right') textX = x + w - 10;

  this.ctx.fillText(String(value), textX, y + h / 2);
}

// 图片单元格（带缓存）
private drawImageCell(value: any, x: number, y: number, 
                      w: number, h: number, align?: string) {
  if (!value) return;
  const src = String(value);
  const size = Math.min(w, h) - 10;
  
  let img = this.imageCache.get(src);
  if (!img) {
    img = new Image();
    img.src = src;
    this.imageCache.set(src, img);
    img.onload = () => this.render();
  }

  if (img.complete) {
    this.ctx.drawImage(img, x + 5, y + (h - size) / 2, size, size);
  }
}

// Switch 开关
private drawSwitchCell(value: any, x: number, y: number, 
                       w: number, h: number, align?: string) {
  const swWidth = 32, swHeight = 16;
  // 计算位置...
  
  this.ctx.fillStyle = value ? '#13ce66' : '#ff4949';
  this.ctx.beginPath();
  this.ctx.roundRect?.(rectX, rectY, swWidth, swHeight, swHeight / 2);
  this.ctx.fill();
  
  // 绘制旋钮
  this.ctx.fillStyle = '#fff';
  const knobX = value ? rectX + swWidth - swHeight + 2 : rectX + 2;
  this.ctx.arc(knobX + (swHeight - 4) / 2, rectY + swHeight / 2, 
               (swHeight - 4) / 2, 0, Math.PI * 2);
  this.ctx.fill();
}
```

---

## 4. 性能优化

### 4.1 虚拟滚动

- **按需绘制**：仅绘制可见区域的行和列
- **缓冲机制**：额外绘制上下几行，防止快速滚动时出现空白
- **性能表现**：支持 1000+ 行数据流畅滚动，保持 60FPS

### 4.2 资源缓存

- **图片缓存**：使用 `Map` 缓存已加载的图片，避免重复请求
- **自动清理**：组件卸载时销毁所有缓存资源

```typescript
public destroy() {
  this.imageCache.forEach(img => {
    img.onload = null;
    img.onerror = null;
    img.src = '';
  });
  this.imageCache.clear();
}
```

### 4.3 防抖处理

- **滚动同步**：使用原生滚动条，避免频繁重绘
- **窗口调整**：使用 `ResizeObserver` 监听容器尺寸变化

### 4.4 Canvas 优化

- **裁剪区域**：使用 `clip()` 限制绘制区域，减少无效绘制
- **分层绘制**：先绘制背景，再绘制内容，最后绘制边框
- **状态保存**：使用 `save()` 和 `restore()` 管理 Canvas 状态

---

## 5. 交互设计

### 5.1 鼠标交互

**悬浮效果**：

```typescript
const handleMouseMove = (e: MouseEvent) => {
  const cell = renderer.value.getCellAt(x, y);
  hoverCell.value = cell;
  
  if (cell?.isExpandBtn || cell?.isSelection) {
    canvasRef.value.style.cursor = 'pointer';
  } else {
    canvasRef.value.style.cursor = 'default';
  }
};
```

**点击选择**：

```typescript
const handleMouseDown = (e: MouseEvent) => {
  const cell = renderer.value.getCellAt(x, y);
  if (cell) {
    if (cell.isExpandBtn) {
      toggleExpand(cell.data.id);
      return;
    }

    if (cell.isSelection) {
      // 切换选择状态
      if (selectedRows.value.has(rowId)) {
        selectedRows.value.delete(rowId);
      } else {
        selectedRows.value.add(rowId);
      }
      renderer.value.setSelectedRows(Array.from(selectedRows.value));
    }
  }
};
```

### 5.2 编辑交互

**双击编辑**：

```typescript
const handleDoubleClick = (e: MouseEvent) => {
  const cell = renderer.value.getCellAt(x, y);
  if (cell && cell.column.renderEdit) {
    openEdit(cell);
  }
};

const openEdit = (cell: CellInfo) => {
  editingCell.value = cell;
  editingData.value = JSON.parse(JSON.stringify(cell.data));
};
```

**编辑弹窗**：

```vue
<Teleport to="body">
  <div v-if="editingCell" class="edit-dialog-popover" 
       :style="editDialogStyle">
    <div class="edit-dialog-content">
      <v-node-renderer :vnode="renderCellEdit(editingCell)" />
    </div>
    <div class="edit-dialog-footer">
      <button class="small" @click="closeEdit">Cancel</button>
      <button class="small primary" @click="saveEdit">Save</button>
    </div>
  </div>
  <div v-if="editingCell" class="popover-click-mask" 
       @click="closeEdit"></div>
</Teleport>
```

### 5.3 表头菜单

**右键菜单**：

```typescript
const handleHeaderMenuClick = (col: ColumnConfig, event: MouseEvent) => {
  const rect = (event.target as HTMLElement).getBoundingClientRect();
  headerMenu.value = { 
    column: col, 
    rect: { 
      x: rect.left - canvasRect.left,
      y: rect.top - canvasRect.top,
      width: rect.width,
      height: rect.height
    }
  };
};
```

**菜单项配置**：

```typescript
const headerMenuItems = computed((): MenuItem[] => {
  if (!headerMenu.value) return [];
  const { column } = headerMenu.value;
  
  const defaultMenu: MenuItem[] = [
    { label: 'Fix to Left', onCommand: (col) => { /* ... */ } },
    { label: 'Unfix', onCommand: (col) => { /* ... */ } }
  ];
  
  if (column.renderHeaderMenu) {
    return column.renderHeaderMenu(column, defaultMenu);
  }
  return defaultMenu;
});
```

---

## 6. 扩展性设计

### 6.1 自定义渲染器

**单元格渲染**：

```typescript
// 在列配置中定义 renderCell
{
  key: 'custom',
  title: 'Custom',
  renderCell: (row, column, h) => {
    return h('div', { style: { color: 'red' } }, row.value);
  }
}
```

**表头渲染**：

```typescript
{
  key: 'name',
  title: 'Name',
  renderHeader: (col, h) => {
    return h('div', { style: { color: 'red' } }, col.title);
  }
}
```

### 6.2 自定义编辑组件

```typescript
{
  key: 'name',
  title: 'Name',
  renderEdit: (data, h) => {
    return h('div', { style: { padding: '20px' } }, [
      h('h3', 'Edit Name'),
      h('input', { 
        value: data.name,
        onInput: (e: any) => data.name = e.target.value
      })
    ]);
  }
}
```

### 6.3 自定义汇总函数

```typescript
{
  key: 'age',
  title: 'Age',
  summary: [
    (data) => {
      const total = data.reduce((acc, r) => acc + (Number(r.age) || 0), 0);
      return { label: '平均值', value: Math.round(total / data.length) };
    },
    (data) => {
      const maxAge = data.reduce((acc, r) => 
        Math.max(acc, Number(r.age) || 0), 0);
      return { label: '最大值', value: maxAge };
    }
  ]
}
```

### 6.4 合并单元格策略

```typescript
const options: TableOptions = {
  spanMethod: ({ rowIndex, columnIndex }) => {
    if (rowIndex === 2 && columnIndex === 7) {
      return { rowspan: 2, colspan: 2 };
    }
    if ((rowIndex === 2 || rowIndex === 3) && 
        (columnIndex === 7 || columnIndex === 8)) {
      if (rowIndex === 2 && columnIndex === 7) 
        return { rowspan: 2, colspan: 2 };
      return { rowspan: 0, colspan: 0 };
    }
    return undefined;
  }
};
```

---

## 7. 使用示例

### 7.1 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue';
import CanvasTable from './table/components/CanvasTable.vue';
import type { ColumnConfig, TableRow } from './table/types';

const columns = ref<ColumnConfig[]>([
  { key: 'id', title: 'ID', type: 'text', width: 60 },
  { key: 'name', title: 'Name', type: 'text', width: 150 },
  { key: 'age', title: 'Age', type: 'text', width: 80 },
]);

const data = ref<TableRow[]>([
  { id: 1, name: 'User 1', age: 25 },
  { id: 2, name: 'User 2', age: 30 },
]);
</script>

<template>
  <CanvasTable :columns="columns" v-model:data="data" />
</template>
```

### 7.2 多级表头

```typescript
const columns = ref<ColumnConfig[]>([
  { 
    title: 'Group 1',
    children: [
      { key: 'id', title: 'ID', width: 60 },
      { key: 'name', title: 'Name', width: 150 },
    ]
  },
  { 
    title: 'Group 2',
    children: [
      { key: 'age', title: 'Age', width: 80 },
      { key: 'email', title: 'Email', width: 200 },
    ]
  },
]);
```

### 7.3 固定列

```typescript
const columns = ref<ColumnConfig[]>([
  { 
    key: 'id', 
    title: 'ID', 
    width: 60, 
    fixed: 'left'  // 固定到左侧
  },
  { key: 'name', title: 'Name', width: 150 },
  // ... 其他列
]);
```

### 7.4 展开行

```typescript
const options: TableOptions = {
  renderExpand: (row, h) => {
    return h('div', { style: { padding: '20px' } }, [
      h('h4', `Details for ${row.name}`),
      h('p', `This is an expanded row for user ${row.id}.`)
    ]);
  }
};

const columns = ref<ColumnConfig[]>([
  { key: 'expand', title: '', type: 'expand', width: 40 },
  // ... 其他列
]);
```

### 7.5 数据汇总

```typescript
const columns = ref<ColumnConfig[]>([
  { 
    key: 'age', 
    title: 'Age', 
    summary: [
      (data) => ({ 
        label: '平均值', 
        value: Math.round(data.reduce((acc, r) => acc + r.age, 0) / data.length) 
      }),
      (data) => ({ 
        label: '最大值', 
        value: Math.max(...data.map(r => r.age)) 
      })
    ]
  },
]);
```

### 7.6 完整示例

参见 `src/App.vue` 文件，包含所有功能的综合演示。

---

## 总结

本 Canvas 表格组件通过创新的混合架构设计，成功结合了 Canvas 的高性能和 DOM 的灵活性：

**核心优势**：

1. **高性能**：虚拟滚动 + Canvas 渲染，支持千行数据流畅操作
2. **灵活扩展**：完整的类型系统和渲染器机制，支持高度定制
3. **丰富功能**：内置多种单元格类型、固定列、合并单元格、汇总行等
4. **良好体验**：DOM 表头提供丰富的交互能力

**适用场景**：

- 大数据量表格展示（1000+ 行）
- 需要复杂交互的企业级应用
- 对性能有较高要求的后台管理系统
- 需要高度定制化的数据展示场景
