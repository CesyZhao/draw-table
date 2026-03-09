<template>
  <div 
    class="table-header" 
    :style="headerStyle"
    @mouseleave="$emit('header-leave')"
  >
    <div 
      v-for="(level, levelIndex) in headerLevels" 
      :key="levelIndex"
      class="header-level"
    >
      <div 
        v-for="col in level" 
        :key="col.key"
        class="header-cell"
        :class="{ 
          'fixed-left': col.fixed === 'left' || col.fixed === true,
          'hovered': hoverIndex === flattenedColumns.indexOf(col),
          'has-menu': col.type !== 'selection' && col.type !== 'expand'
        }"
        :style="getHeaderCellStyle(col, levelIndex)"
        @click.stop="handleHeaderClick(col, $event)"
        @mouseenter="$emit('header-hover', flattenedColumns.indexOf(col))"
      >
        <div class="header-cell-content">
          <!-- Selection checkbox -->
          <span 
            v-if="col.type === 'selection'" 
            class="header-checkbox"
            @click.stop="$emit('toggle-all')"
          >
            <input 
              type="checkbox" 
              :checked="isAllSelected"
              :indeterminate.prop="isIndeterminate"
            />
          </span>
          
          <!-- Column title -->
          <span class="header-title">{{ col.title }}</span>
          
          <!-- Menu icon -->
          <span 
            v-if="col.type !== 'selection' && col.type !== 'expand'"
            class="header-menu-icon"
            @click.stop="handleMenuClick(col, $event)"
          >•</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ColumnConfig } from '../types';

const props = defineProps<{
  columns: ColumnConfig[];
  flattenedColumns: ColumnConfig[];
  columnLevels: number;
  headerHeight: number;
  scrollX: number;
  fixedLeftWidth: number;
  hoverIndex: number;
  selectedRows: Set<string | number>;
  data: any[];
}>();

const emit = defineEmits<{
  'header-hover': [index: number];
  'header-leave': [];
  'header-click': [col: ColumnConfig, event: MouseEvent];
  'header-menu': [col: ColumnConfig, event: MouseEvent];
  'toggle-all': [];
}>();

// 计算表头样式
const headerStyle = computed(() => ({
  height: `${props.headerHeight}px`
}));

// 将列按层级分组
const headerLevels = computed(() => {
  const levels: ColumnConfig[][] = [];
  
  const flattenByLevel = (cols: ColumnConfig[], level: number) => {
    if (!levels[level]) levels[level] = [];
    
    cols.forEach(col => {
      if (col.children && col.children.length > 0) {
        // 父级列，添加到当前层级
        if (levels[level]) levels[level].push(col);
        flattenByLevel(col.children, level + 1);
      } else {
        // 叶子节点，添加到对应层级
        if (!levels[level]) levels[level] = [];
        if (levels[level]) levels[level].push(col);
      }
    });
  };
  
  flattenByLevel(props.columns, 0);
  return levels;
});

const isAllSelected = computed(() => {
  return props.data.length > 0 && props.selectedRows.size === props.data.length;
});

const isIndeterminate = computed(() => {
  return props.selectedRows.size > 0 && props.selectedRows.size < props.data.length;
});

const getHeaderCellStyle = (col: ColumnConfig, levelIndex: number) => {
  const width = getColumnWidth(col);
  const baseHeight = props.columnLevels > 1 ? 40 : props.headerHeight;
  
  // 计算高度（跨行）
  const isLeaf = !col.children || col.children.length === 0;
  const rowspan = isLeaf ? (props.columnLevels - levelIndex) : 1;
  const height = rowspan * baseHeight;
  
  // 计算位置
  const position = getColumnPosition(col);
  const left = (col.fixed === 'left' || col.fixed === true) 
    ? position 
    : position - props.scrollX;
  
  return {
    width: `${width}px`,
    height: `${height}px`,
    left: `${left}px`,
    position: 'absolute' as const,
    top: `${levelIndex * baseHeight}px`
  };
};

const getColumnWidth = (col: ColumnConfig): number => {
  if (col.children && col.children.length > 0) {
    return col.children.reduce((acc, child) => acc + getColumnWidth(child), 0);
  }
  return col.width || 100;
};

const getColumnPosition = (col: ColumnConfig): number => {
  const index = props.flattenedColumns.indexOf(col);
  if (index === -1) {
    // 父级列，需要计算子列的起始位置
    const findPosition = (cols: ColumnConfig[], currentPos: number): number => {
      for (const c of cols) {
        if (c === col) return currentPos;
        if (c.children && c.children.length > 0) {
          const pos = findPosition(c.children, currentPos);
          if (pos !== -1) return pos;
        }
        currentPos += getColumnWidth(c);
      }
      return -1;
    };
    return findPosition(props.columns, 0);
  }
  
  // 叶子节点，直接从 columnPositions 获取
  let position = 0;
  for (let i = 0; i < index; i++) {
    position += props.flattenedColumns[i]?.width || 100;
  }
  return position;
};

const handleHeaderClick = (col: ColumnConfig, event: MouseEvent) => {
  if (col.type === 'selection') {
    emit('toggle-all');
  } else {
    emit('header-click', col, event);
  }
};

const handleMenuClick = (col: ColumnConfig, event: MouseEvent) => {
  emit('header-menu', col, event);
};
</script>

<style scoped>
.table-header {
  position: relative;
  background: #f5f7fa;
  border-bottom: 1px solid #ebeef5;
  overflow: hidden;
}

.header-level {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 100%;
  pointer-events: none;
}

.header-level > .header-cell {
  pointer-events: auto;
}

.header-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  border-right: 1px solid #ebeef5;
  box-sizing: border-box;
  user-select: none;
  transition: background-color 0.2s;
}

.header-cell.hovered {
  background-color: #e8eaed;
}

.header-cell.fixed-left {
  position: sticky;
  left: 0;
  z-index: 10;
  background: inherit;
}

.header-cell-content {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  width: 100%;
  height: 100%;
}

.header-title {
  font-weight: bold;
  color: #303133;
  font-size: 14px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-checkbox {
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-menu-icon {
  cursor: pointer;
  color: #909399;
  font-size: 16px;
  opacity: 0;
  transition: opacity 0.2s;
}

.header-cell:hover .header-menu-icon {
  opacity: 1;
}

.header-menu-icon:hover {
  color: #409eff;
}
</style>
