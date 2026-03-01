<template>
  <div class="canvas-table-container" ref="containerRef">
    <div 
      class="canvas-wrapper" 
      :style="wrapperStyle"
      @wheel.prevent="handleWheel"
    >
      <canvas ref="canvasRef"></canvas>
      
      <!-- Horizontal Scrollbar -->
      <div 
        class="scrollbar horizontal" 
        ref="hScrollRef"
        @scroll="handleHScroll"
      >
        <div :style="{ width: totalWidth + 'px', height: '1px' }"></div>
      </div>
      
      <!-- Vertical Scrollbar -->
      <div 
        class="scrollbar vertical" 
        ref="vScrollRef"
        @scroll="handleVScroll"
      >
        <div :style="{ height: totalHeight + 'px', width: '1px' }"></div>
      </div>

      <!-- Overlays (Edit buttons, Dialogs, etc.) -->
      <div class="table-overlays" :style="overlayStyle">
        <div 
          v-if="hoverCell && hoverCell.column.renderEdit"
          class="edit-btn"
          :style="editBtnStyle"
          @click.stop="openEdit(hoverCell)"
        >
          <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
        </div>

        <!-- Header Menu -->
        <div 
          v-if="headerMenu" 
          class="header-menu-overlay" 
          @click.self="headerMenu = null"
        >
          <div class="header-menu" :style="headerMenuStyle">
            <div 
              v-for="item in headerMenuItems" 
              :key="item.label"
              class="menu-item"
              @click="handleMenuCommand(item)"
            >
              <span class="icon">{{ item.icon || '•' }}</span>
              <span class="label">{{ item.label }}</span>
            </div>
          </div>
        </div>

        <!-- Expand Rows Overlay -->
        <div 
          v-for="rowId in expandedRows" 
          :key="rowId"
          class="expand-row-overlay"
          :style="getExpandStyle(rowId)"
        >
          <component :is="renderExpandContent(rowId)" />
        </div>

        <!-- Edit Dialog -->
        <Teleport to="body">
          <div v-if="editingCell" class="edit-dialog-popover" :style="editDialogStyle">
            <div class="edit-dialog-content">
              <v-node-renderer :vnode="renderCellEdit(editingCell)" />
            </div>
            <div class="edit-dialog-footer">
              <button class="small" @click="closeEdit">Cancel</button>
              <button class="small primary" @click="saveEdit">Save</button>
            </div>
          </div>
          <!-- Click outside listener for popover -->
          <div v-if="editingCell" class="popover-click-mask" @click="closeEdit"></div>
        </Teleport>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed, shallowRef, h, defineComponent } from 'vue';
import { CanvasRenderer } from '../core/renderer';
import type { ColumnConfig, TableRow, TableOptions, CellInfo, MenuItem } from '../types';

// Helper component to render VNodes
const VNodeRenderer = defineComponent({
  props: ['vnode'],
  setup(props) {
    return () => props.vnode;
  }
});

const props = defineProps<{
  columns: ColumnConfig[];
  data: TableRow[];
  options?: Partial<TableOptions>;
}>();

const emit = defineEmits(['update:data', 'select-change', 'header-command']);

const containerRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const hScrollRef = ref<HTMLDivElement | null>(null);
const vScrollRef = ref<HTMLDivElement | null>(null);

const renderer = shallowRef<CanvasRenderer | null>(null);
const totalWidth = ref(0);
const totalHeight = ref(0);
const viewWidth = ref(0);
const viewHeight = ref(0);
const scrollX = ref(0);
const scrollY = ref(0);

// Interaction state
const hoverCell = ref<CellInfo | null>(null);
const editingCell = ref<CellInfo | null>(null);
const editingData = ref<TableRow | null>(null);
const selectedRows = ref<Set<string | number>>(new Set());
const expandedRows = ref<Set<string | number>>(new Set());
const headerMenu = ref<{ column: ColumnConfig, rect: any } | null>(null);

const wrapperStyle = computed(() => ({
  width: '100%',
  height: '100%',
  position: 'relative' as const,
  overflow: 'hidden'
}));

const overlayStyle = computed(() => ({
  position: 'absolute' as const,
  top: 0,
  left: 0,
  pointerEvents: 'none' as const,
  width: '100%',
  height: '100%'
}));

const editBtnStyle = computed(() => {
  if (!hoverCell.value) return {};
  const { rect } = hoverCell.value;
  return {
    position: 'absolute' as const,
    left: `${rect.x + rect.width - 24}px`,
    top: `${rect.y + (rect.height - 20) / 2}px`,
    pointerEvents: 'auto' as const
  };
});

const editDialogStyle = computed(() => {
  if (!editingCell.value || !canvasRef.value) return {};
  
  const canvasRect = canvasRef.value.getBoundingClientRect();
  const { rect } = editingCell.value;
  
  // Position popover relative to the cell
  // We place it below the cell by default
  let top = canvasRect.top + rect.y + rect.height + 5;
  let left = canvasRect.left + rect.x;
  
  // Simple viewport boundary check
  const popoverWidth = 300; // Estimated or fixed
  if (left + popoverWidth > window.innerWidth) {
    left = window.innerWidth - popoverWidth - 20;
  }
  
  return {
    position: 'fixed' as const,
    top: `${top}px`,
    left: `${left}px`,
    zIndex: 2000,
    pointerEvents: 'auto' as const
  };
});

const headerMenuStyle = computed(() => {
  if (!headerMenu.value) return {};
  const { rect } = headerMenu.value;
  return {
    position: 'absolute' as const,
    left: `${rect.x + rect.width - 120}px`,
    top: `${rect.y + rect.height}px`,
    pointerEvents: 'auto' as const
  };
});

const headerMenuItems = computed((): MenuItem[] => {
  if (!headerMenu.value) return [];
  const { column } = headerMenu.value;
  const defaultMenu: MenuItem[] = [
    { 
      label: 'Fix to Left', 
      onCommand: (col) => {
        // Find index of this column and fix all previous ones
        const idx = props.columns.findIndex(c => c.key === col.key);
        props.columns.forEach((c, i) => {
          if (i <= idx) c.fixed = 'left';
        });
        renderer.value?.setColumns(props.columns);
      } 
    },
    { 
      label: 'Unfix', 
      onCommand: (col) => {
        col.fixed = false;
        renderer.value?.setColumns(props.columns);
      } 
    }
  ];
  if (column.renderHeaderMenu) {
    return column.renderHeaderMenu(column, defaultMenu);
  }
  return defaultMenu;
});

const handleMenuCommand = (item: MenuItem) => {
  if (headerMenu.value) {
    item.onCommand(headerMenu.value.column);
    headerMenu.value = null;
  }
};

const handleMouseMove = (e: MouseEvent) => {
  if (!canvasRef.value || !renderer.value) return;
  const rect = canvasRef.value.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  // Handle header hover
  const header = renderer.value.getHeaderAt(x, y);
  if (header) {
    const idx = props.columns.findIndex(c => c.key === header.column.key);
    renderer.value.setHoverHeader(idx);
    
    // Set cursor style
    if (header.isMenu || header.column.type === 'selection') {
      canvasRef.value.style.cursor = 'pointer';
    } else {
      canvasRef.value.style.cursor = 'default';
    }
  } else {
    renderer.value.setHoverHeader(-1);
    canvasRef.value.style.cursor = 'default';
  }

  hoverCell.value = renderer.value.getCellAt(x, y);
  
  // Update cursor if hovering over expand button or selection
  if (hoverCell.value) {
    if (hoverCell.value.isExpandBtn || hoverCell.value.isSelection) {
      canvasRef.value.style.cursor = 'pointer';
    }
  }
};

const handleMouseDown = (e: MouseEvent) => {
  if (!canvasRef.value || !renderer.value) return;
  const rect = canvasRef.value.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  // Check header click
  const header = renderer.value.getHeaderAt(x, y);
  if (header) {
    if (header.isMenu) {
      headerMenu.value = { column: header.column, rect: header.rect };
    } else if (header.column.type === 'selection') {
      // Toggle all selection
      const allSelected = selectedRows.value.size === props.data.length;
      if (allSelected) {
        selectedRows.value.clear();
      } else {
        props.data.forEach(r => selectedRows.value.add(r.id));
      }
      renderer.value.setSelectedRows(Array.from(selectedRows.value));
      emit('select-change', Array.from(selectedRows.value));
    }
    return;
  }

  const cell = renderer.value.getCellAt(x, y);
  if (cell) {
    if (cell.isExpandBtn) {
      toggleExpand(cell.data.id);
      return;
    }

    const rowId = cell.data.id;
    if (cell.isSelection) {
      if (selectedRows.value.has(rowId)) {
        selectedRows.value.delete(rowId);
      } else {
        selectedRows.value.add(rowId);
      }
      renderer.value.setSelectedRows(Array.from(selectedRows.value));
      emit('select-change', Array.from(selectedRows.value));
      return;
    }

    if (props.options?.multiSelect) {
      if (selectedRows.value.has(rowId)) {
        selectedRows.value.delete(rowId);
      } else {
        selectedRows.value.add(rowId);
      }
    } else {
      selectedRows.value.clear();
      selectedRows.value.add(rowId);
    }
    emit('select-change', Array.from(selectedRows.value));
  }
};

const handleDoubleClick = (e: MouseEvent) => {
  if (!canvasRef.value || !renderer.value) return;
  const rect = canvasRef.value.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const cell = renderer.value.getCellAt(x, y);
  if (cell && cell.column.renderEdit) {
    openEdit(cell);
  }
};

const openEdit = (cell: CellInfo) => {
  editingCell.value = cell;
  editingData.value = JSON.parse(JSON.stringify(cell.data));
};

const toggleExpand = (rowId: string | number) => {
  if (expandedRows.value.has(rowId)) {
    expandedRows.value.delete(rowId);
  } else {
    expandedRows.value.add(rowId);
  }
  renderer.value?.setExpandedRows(Array.from(expandedRows.value));
  updateTotalSize();
};

const closeEdit = () => {
  editingCell.value = null;
  editingData.value = null;
};

const saveEdit = () => {
  if (editingCell.value && editingData.value) {
    const rowId = editingCell.value.data.id;
    const rowIndex = props.data.findIndex(r => r.id === rowId);
    if (rowIndex !== -1) {
      // In a real application, you'd likely want to avoid direct prop mutation
      // We emit the change so the parent can update the data
      const newData = [...props.data];
      newData[rowIndex] = editingData.value;
      emit('update:data', newData);
      
      // Since renderer takes data as prop, we need to manually update it if it doesn't watch props
      renderer.value?.setData(newData);
    }
  }
  closeEdit();
};

const renderCellEdit = (cell: CellInfo) => {
  if (!cell.column.renderEdit || !editingData.value) return null;
  return cell.column.renderEdit(editingData.value, (comp: any, propsOrChildren?: any, children?: any) => {
    if (propsOrChildren && (typeof propsOrChildren === 'string' || Array.isArray(propsOrChildren) || propsOrChildren.__v_isVNode)) {
      return h(comp, null, propsOrChildren);
    }
    return h(comp, propsOrChildren, children);
  });
};

const getExpandStyle = (rowId: string | number) => {
  if (!renderer.value) return {};
  const rowIndex = props.data.findIndex(r => r.id === rowId);
  if (rowIndex === -1) return {};
  
  const rowOffsets = renderer.value.getRowOffsets();
  const y = (rowOffsets[rowIndex] ?? 0) - scrollY.value + (props.options?.headerHeight || 48);
  const h = (rowOffsets[rowIndex+1] ?? 0) - (rowOffsets[rowIndex] ?? 0) - (props.options?.rowHeight || 40);
  const fixedLeftWidth = renderer.value.getFixedLeftWidth();

  return {
    position: 'absolute' as const,
    top: `${y + (props.options?.rowHeight || 40)}px`,
    left: `${fixedLeftWidth}px`,
    width: `${viewWidth.value - fixedLeftWidth}px`,
    height: `${h}px`,
    pointerEvents: 'auto' as const,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderBottom: '1px solid #ebeef5',
    // Sync inner scrolling content
    display: 'flex'
  };
};

const getExpandContentStyle = () => {
  return {
    marginLeft: `-${scrollX.value}px`,
    minWidth: `${totalWidth.value - renderer.value?.getFixedLeftWidth()!}px`
  };
};

const renderExpandContent = (rowId: string | number) => {
  const row = props.data.find(r => r.id === rowId);
  if (!row || !props.options?.renderExpand) return null;
  return h('div', { style: getExpandContentStyle() }, [
    props.options.renderExpand(row, (comp: any, propsOrChildren?: any, children?: any) => {
      if (propsOrChildren && (typeof propsOrChildren === 'string' || Array.isArray(propsOrChildren) || propsOrChildren.__v_isVNode)) {
        return h(comp, null, propsOrChildren);
      }
      return h(comp, propsOrChildren, children);
    })
  ]);
};

const handleHScroll = (e: Event) => {
  const target = e.target as HTMLDivElement;
  scrollX.value = target.scrollLeft;
  renderer.value?.scrollTo(scrollX.value, scrollY.value);
  hoverCell.value = null;
};

const handleVScroll = (e: Event) => {
  const target = e.target as HTMLDivElement;
  scrollY.value = target.scrollTop;
  renderer.value?.scrollTo(scrollX.value, scrollY.value);
  hoverCell.value = null;
};

const handleWheel = (e: WheelEvent) => {
  if (!vScrollRef.value || !hScrollRef.value) return;
  
  // Use shift for horizontal or just deltaX
  const deltaY = e.deltaY;
  const deltaX = e.shiftKey ? e.deltaY : e.deltaX;
  
  vScrollRef.value.scrollTop += deltaY;
  hScrollRef.value.scrollLeft += deltaX;
};

const handleResize = (entries: ResizeObserverEntry[]) => {
  const entry = entries[0];
  if (!entry || !renderer.value) return;
  
  const { width, height } = entry.contentRect;
  viewWidth.value = width;
  viewHeight.value = height;
  
  renderer.value.resize(width, height);
  updateTotalSize();
};

const updateTotalSize = () => {
  if (!renderer.value) return;
  totalWidth.value = renderer.value.getTotalWidth();
  totalHeight.value = renderer.value.getTotalHeight();
};

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  if (canvasRef.value) {
    renderer.value = new CanvasRenderer(canvasRef.value);
    renderer.value.setColumns(props.columns);
    renderer.value.setData(props.data);
    renderer.value.setOptions(props.options || {});
    
    updateTotalSize();
    
    resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.value) {
      resizeObserver.observe(containerRef.value);
    }

    canvasRef.value.addEventListener('mousemove', handleMouseMove);
    canvasRef.value.addEventListener('mousedown', handleMouseDown);
    canvasRef.value.addEventListener('dblclick', handleDoubleClick);
  }
});

onUnmounted(() => {
  resizeObserver?.disconnect();
  canvasRef.value?.removeEventListener('mousemove', handleMouseMove);
  canvasRef.value?.removeEventListener('mousedown', handleMouseDown);
  canvasRef.value?.removeEventListener('dblclick', handleDoubleClick);
  
  renderer.value?.destroy();
  renderer.value = null;
});

watch(() => props.columns, (cols) => {
  renderer.value?.setColumns(cols);
  updateTotalSize();
}, { deep: true });

watch(() => props.data, (data) => {
  renderer.value?.setData(data);
  updateTotalSize();
}, { deep: true });

watch(() => props.options, (opts) => {
  if (opts) renderer.value?.setOptions(opts);
}, { deep: true });

</script>

<style scoped>
.canvas-table-container {
  width: 100%;
  height: 100%;
  border: 1px solid #ebeef5;
  box-sizing: border-box;
}

.canvas-wrapper {
  background: #fff;
}

.scrollbar {
  position: absolute;
  overflow: auto;
  z-index: 10;
}

.scrollbar.horizontal {
  bottom: 0;
  left: 0;
  right: 0;
  height: 12px;
}

.scrollbar.vertical {
  top: 0;
  right: 0;
  bottom: 0;
  width: 12px;
}

/* Hide default scrollbars for the wrapper, use custom ones */
.scrollbar::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.scrollbar::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.scrollbar::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.table-overlays {
  z-index: 5;
}

.edit-btn {
  width: 20px;
  height: 20px;
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #409eff;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.edit-btn:hover {
  background: #f5f7fa;
}

.header-menu-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: auto;
  z-index: 20;
}

.header-menu {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1);
  padding: 5px 0;
  min-width: 120px;
}

.menu-item {
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.menu-item:hover {
  background: #f5f7fa;
  color: #409eff;
}

.edit-dialog-popover {
  background: #fff;
  border-radius: 4px;
  width: 300px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1);
  border: 1px solid #ebeef5;
  display: flex;
  flex-direction: column;
  z-index: 2000;
}

.popover-click-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1999;
}

.edit-dialog-content {
  padding: 12px;
}

.edit-dialog-footer {
  padding: 8px 12px;
  border-top: 1px solid #ebeef5;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

button.small {
  padding: 4px 12px;
  font-size: 12px;
}

button.primary {
  background: #409eff;
  color: #fff;
  border-color: #409eff;
}
</style>
