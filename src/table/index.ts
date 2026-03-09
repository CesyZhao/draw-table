import CanvasTable from './components/CanvasTable.vue';
import TableHeader from './components/TableHeader.vue';
import { CanvasRenderer } from './core/renderer';

export type {
  CellType,
  CellStyle,
  ColumnConfig,
  MenuItem,
  SummaryResult,
  SummaryFunction,
  TableRow,
  TableOptions,
  CellInfo,
  MergedCell,
} from './types';

export { CanvasTable, TableHeader, CanvasRenderer };

// 默认导出
export default CanvasTable;
