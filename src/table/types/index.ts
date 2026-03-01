import type { VNode } from 'vue';

export type CellType = 'text' | 'image' | 'checkbox' | 'radio' | 'switch' | 'color-picker' | 'tags' | 'expand' | 'selection' | 'index';

export interface CellStyle {
  color?: string;
  backgroundColor?: string;
  fontSize?: number;
  fontFamily?: string;
  textAlign?: 'left' | 'center' | 'right';
  padding?: [number, number, number, number]; // [top, right, bottom, left]
  border?: boolean;
}

export interface ColumnConfig {
  key?: string;
  title: string;
  type?: CellType;
  width?: number;
  fixed?: 'left' | 'right' | boolean;
  align?: 'left' | 'center' | 'right';
  renderEdit?: (data: any, h: (component: any, props?: any, children?: any) => VNode) => VNode;
  renderHeaderMenu?: (column: ColumnConfig, defaultMenu: MenuItem[]) => MenuItem[];
  summary?: SummaryFunction[];
  renderHeader?: (column: ColumnConfig, h: (component: any, propsOrChildren?: any, children?: any) => VNode) => VNode;
  renderCell?: (row: any, column: ColumnConfig, h: (component: any, propsOrChildren?: any, children?: any) => VNode) => VNode;
  children?: ColumnConfig[];
  [key: string]: any;
}

export interface MenuItem {
  icon?: string;
  label: string;
  onCommand: (column: ColumnConfig) => void;
}

export interface SummaryResult {
  label: string;
  value: string | number;
}

export type SummaryFunction = (data: any[]) => SummaryResult;

export interface TableRow {
  id: string | number;
  [key: string]: any;
  _expanded?: boolean;
  _selected?: boolean;
}

export interface TableOptions {
  border?: boolean;
  stripe?: boolean;
  multiSelect?: boolean;
  fixedHeader?: boolean;
  rowHeight?: number;
  headerHeight?: number;
  renderExpand?: (row: TableRow, h: (component: any, props?: any, children?: any) => VNode) => VNode;
  spanMethod?: (info: { row: number, column: ColumnConfig, rowIndex: number, columnIndex: number }) => { rowspan: number, colspan: number } | undefined;
}

export interface CellInfo {
  row: number;
  col: number;
  rect: { x: number, y: number, width: number, height: number };
  column: ColumnConfig;
  data: any;
  isExpandBtn?: boolean;
  isSelection?: boolean;
}

export interface MergedCell {
  row: number;
  col: number;
  rowspan: number;
  colspan: number;
}
