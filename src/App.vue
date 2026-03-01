<script setup lang="ts">
import { ref, h } from 'vue';
import CanvasTable from './table/components/CanvasTable.vue';
import type { ColumnConfig, TableRow, TableOptions } from './table/types';

const columns = ref<ColumnConfig[]>([
  { key: 'expand', title: '', type: 'expand', width: 40, align: 'center', fixed: 'left' },
  { key: 'selection', title: '', type: 'selection', width: 40, align: 'center', fixed: 'left' },
  { 
    title: 'Group 1',
    fixed: 'left',
    children: [
      { key: 'id', title: 'ID', type: 'text', width: 60, align: 'center', fixed: 'left' },
      { 
        key: 'name', 
        title: 'Name', 
        type: 'text', 
        width: 150, 
        fixed: 'left',
        renderHeader: (col, h) => h('div', { style: { color: 'red' } }, col.title),
        renderEdit: (data, h) => h('div', { style: { padding: '20px' } }, [
           h('h3', 'Edit Name'),
           h('input', { 
             value: data.name,
             style: { width: '100%', padding: '8px', marginTop: '10px' },
             onInput: (e: any) => data.name = e.target.value
           })
         ])
      },
    ]
  },
  { key: 'avatar', title: 'Avatar', type: 'image', width: 80, align: 'center' },
  { key: 'age', title: 'Age', type: 'text', width: 80, align: 'center', summary: [
    (data) => {
      const total = data.reduce((acc, r) => acc + (Number(r.age) || 0), 0);
      return { label: '平均值', value: Math.round(total / data.length) };
    },
    (data) => {
      const maxAge = data.reduce((acc, r) => Math.max(acc, Number(r.age) || 0), 0);
      return { label: '最大值', value: maxAge };
    }
  ]},
  { key: 'status', title: 'Active', type: 'switch', width: 100, align: 'center', summary: [
    (data) => {
      const activeCount = data.filter(r => r.status).length;
      return { label: '平均值', value: `${activeCount} active` };
    }
  ]},
  { key: 'tags', title: 'Tags', type: 'tags', width: 200 },
  { key: 'color', title: 'Color', type: 'color-picker', width: 100, align: 'center' },
  { key: 'address', title: 'Address', type: 'text', width: 300 },
  { key: 'email', title: 'Email', type: 'text', width: 200 },
]);

const generateData = (count: number): TableRow[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `User ${i + 1}`,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`,
    age: 20 + (i % 30),
    status: i % 2 === 0,
    tags: ['Vue', 'TS', 'Canvas'].slice(0, (i % 3) + 1),
    color: i % 2 === 0 ? '#409eff' : '#67c23a',
    address: `Street ${i + 1}, City ${i % 10}`,
    email: `user${i+1}@example.com`
  }));
};

const data = ref(generateData(1000));

const options: Partial<TableOptions> = {
  border: true,
  stripe: true,
  multiSelect: true,
  renderExpand: (row, h) => h('div', { style: { padding: '20px', background: '#fafafa' } }, [
    h('h4', {}, `Details for ${row.name}`),
    h('p', {}, `This is an expanded row for user ${row.id}. You can put any component here.`),
    h('div', { style: { display: 'flex', gap: '10px' } }, [
      h('button', { onClick: () => alert('Action 1') }, 'Action 1'),
      h('button', { onClick: () => alert('Action 2') }, 'Action 2')
    ])
  ]),
  spanMethod: ({ rowIndex, columnIndex }) => {
    if (rowIndex === 2 && columnIndex === 7) {
      return { rowspan: 2, colspan: 2 };
    }
    if ((rowIndex === 2 || rowIndex === 3) && (columnIndex === 7 || columnIndex === 8)) {
      if (rowIndex === 2 && columnIndex === 7) return { rowspan: 2, colspan: 2 };
      return { rowspan: 0, colspan: 0 };
    }
    return undefined;
  }
};
</script>

<template>
  <div class="app-container">
    <h1>Canvas Table Demo (1000 Rows)</h1>
    <div class="table-holder">
      <CanvasTable :columns="columns" v-model:data="data" :options="options" />
    </div>
  </div>
</template>

<style>
body {
  margin: 0;
  padding: 0;
  height: 100vh;
  overflow: hidden;
}
#app {
  width: 100%;
  height: 100%;
}
.app-container {
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.table-holder {
  flex: 1;
  min-height: 0;
  margin-top: 20px;
}
</style>
