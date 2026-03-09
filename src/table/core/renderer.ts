import type { ColumnConfig, TableRow, TableOptions, CellInfo } from '../types';

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private columns: ColumnConfig[] = [];
  private data: TableRow[] = [];
  private options: Required<TableOptions> = {
    rowHeight: 40,
    headerHeight: 48,
    border: true,
    stripe: true,
    multiSelect: false,
    fixedHeader: true,
    renderExpand: () => (null as any),
    spanMethod: () => undefined
  };

  private scrollX = 0;
  private scrollY = 0;
  private width = 0;
  private height = 0;

  // Layout info
  private columnPositions: number[] = [];
  private rowOffsets: number[] = [];
  private totalWidth = 0;
  private totalHeight = 0;
  private fixedLeftWidth = 0;
  private summaryRows: any[][] = [];
  private expandedRowKeys = new Set<string | number>();
  private selectedRowKeys = new Set<string | number>();
  private imageCache: Map<string, HTMLImageElement> = new Map();
  private flattenedColumns: ColumnConfig[] = [];
  private columnLevels = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    this.ctx = ctx;
  }

  public destroy() {
    this.imageCache.forEach(img => {
      img.onload = null;
      img.onerror = null;
      img.src = '';
    });
    this.imageCache.clear();
    this.data = [];
    this.columns = [];
    this.summaryRows = [];
  }

  public setExpandedRows(keys: (string | number)[]) {
    this.expandedRowKeys = new Set(keys);
    this.calculateLayout();
    this.render();
  }

  public setData(data: TableRow[]) {
    this.data = data;
    this.calculateLayout();
    this.render();
  }

  public setColumns(columns: ColumnConfig[]) {
    this.columns = columns;
    this.flattenColumns();
    this.calculateLayout();
    this.render();
  }

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
    
    // Update header height if levels > 1
    const baseHeaderHeight = 40;
    if (this.columnLevels > 1) {
      this.options.headerHeight = this.columnLevels * baseHeaderHeight;
    } else {
      this.options.headerHeight = 48;
    }
  }

  public setOptions(options: Partial<TableOptions>) {
    this.options = { ...this.options, ...options };
    this.calculateLayout();
    this.render();
  }

  public resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.resetTransform();
    this.ctx.scale(dpr, dpr);
    this.render();
  }

  public scrollTo(x: number, y: number) {
    this.scrollX = x;
    this.scrollY = y;
    this.render();
  }

  private calculateLayout() {
    let currentX = 0;
    this.columnPositions = [0];
    let fixedWidth = 0;
    this.flattenedColumns.forEach((col) => {
      const w = col.width || 100;
      currentX += w;
      this.columnPositions.push(currentX);
      if (col.fixed === 'left' || col.fixed === true) {
        fixedWidth = currentX;
      }
    });
    this.totalWidth = currentX;
    this.fixedLeftWidth = fixedWidth;
    
    // Calculate row offsets for expanded rows
    let currentY = 0;
    this.rowOffsets = [0];
    const { rowHeight } = this.options;
    this.data.forEach(row => {
      currentY += rowHeight;
      if (this.expandedRowKeys.has(row.id)) {
        currentY += rowHeight * 3; // Fixed expand height for demo
      }
      this.rowOffsets.push(currentY);
    });
    this.totalHeight = currentY;
    
    this.calculateSummaries();
  }

  private getRowRange(rowspanOffset = 20) {
    const { headerHeight } = this.options;
    const summaryHeight = this.summaryRows.length * this.options.rowHeight;
    
    // Visible body height is total canvas height minus header and summary rows
    const visibleBodyHeight = this.height - headerHeight - summaryHeight;
    
    const startY = this.scrollY;
    const endY = startY + visibleBodyHeight;

    let startRow = 0;
    while (startRow < this.rowOffsets.length && (this.rowOffsets[startRow + 1] ?? 0) < startY) {
      startRow++;
    }

    let endRow = startRow;
    while (endRow < this.rowOffsets.length && (this.rowOffsets[endRow] ?? 0) < endY) {
      endRow++;
    }

    return {
      startRow: Math.max(0, startRow - rowspanOffset),
      endRow: Math.min(this.data.length, endRow + 1)
    };
  }

  private calculateSummaries() {
    this.summaryRows = [];
    const rowsByLabel = new Map<string, any[]>();
    
    this.flattenedColumns.forEach((col, j) => {
      if (!col.summary) return;
      
      col.summary.forEach(summaryFn => {
        try {
          const result = summaryFn(this.data);
          if (result && result.label) {
            const { label, value } = result;
            if (!rowsByLabel.has(label)) {
              rowsByLabel.set(label, new Array(this.flattenedColumns.length).fill(''));
            }
            rowsByLabel.get(label)![j] = value;
          }
        } catch (e) {
          console.error('Summary calculation error:', e);
        }
      });
    });

    // Convert to array and set the first column as label
    rowsByLabel.forEach((rowData, label) => {
      rowData[0] = label;
      this.summaryRows.push(rowData);
    });
  }

  render() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    // 1. Draw Body (scrolling part)
    this.drawBody();
    
    // 2. Draw Fixed Left Body
    this.drawFixedLeftBody();
    
    // 4. Draw Summary Rows (Fixed at bottom)
    this.drawSummaryRows();
  }

  private getColumnWidth(col: ColumnConfig): number {
    if (col.children && col.children.length > 0) {
      const width = col.children.reduce((acc, child) => acc + this.getColumnWidth(child), 0);
      return width;
    }
    return col.width || 100;
  }

  public setSelectedRows(keys: (string | number)[]) {
    this.selectedRowKeys = new Set(keys);
    this.render();
  }

  private drawBody() {
    const { headerHeight } = this.options;
    const { startRow, endRow } = this.getRowRange();
    const summaryHeight = this.summaryRows.length * this.options.rowHeight;

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(this.fixedLeftWidth, headerHeight, this.width - this.fixedLeftWidth, this.height - headerHeight - summaryHeight);
    this.ctx.clip();

    const processedCells = new Set<string>();

    const mergedCellsToDraw: Array<{ col: ColumnConfig, val: any, x: number, y: number, w: number, h: number, r: number, c: number, bgColor: string }> = [];

    for (let i = startRow; i < endRow; i++) {
      const row = this.data[i];
      if (!row) continue;
      const y = (this.rowOffsets[i] ?? 0) - this.scrollY + headerHeight;
      const h = (this.rowOffsets[i+1] ?? 0) - (this.rowOffsets[i] ?? 0);

      const rowBgColor = i % 2 === 1 && this.options.stripe ? '#fafafa' : '#fff';

      this.flattenedColumns.forEach((col, j) => {
        if (col.fixed === 'left' || col.fixed === true) return;
        if (processedCells.has(`${i},${j}`)) return;

        const x = (this.columnPositions[j] ?? 0) - this.scrollX;
        const w = (this.columnPositions[j+1] ?? 0) - (this.columnPositions[j] ?? 0);

        // Handle merged cells
        const span = this.options.spanMethod({ row: i, column: col, rowIndex: i, columnIndex: j });
        if (span) {
          const { rowspan, colspan } = span;
          if (rowspan === 0 || colspan === 0) return;
          
          const spanW = (this.columnPositions[j + colspan] ?? this.totalWidth) - (this.columnPositions[j] ?? 0);
          const spanH = (this.rowOffsets[i + rowspan] ?? this.totalHeight) - (this.rowOffsets[i] ?? 0);
          
          for (let r = 0; r < rowspan; r++) {
            for (let c = 0; c < colspan; c++) {
              processedCells.add(`${i + r},${j + c}`);
            }
          }
          
          mergedCellsToDraw.push({ col, val: row[col.key || ''], x, y, w: spanW, h: spanH, r: i, c: j, bgColor: rowBgColor });
        } else {
          this.ctx.fillStyle = rowBgColor;
          this.ctx.fillRect(x, y, w, this.options.rowHeight);
          
          this.drawCell(col, row[col.key || ''], x, y, w, this.options.rowHeight, i);
          if (this.options.border) {
            this.ctx.strokeStyle = '#ebeef5';
            this.ctx.strokeRect(x + 0.5, y + 0.5, w, this.options.rowHeight);
          }
        }
      });

      // Draw expand content if expanded
      // 优化：不在 Canvas 中绘制展开内容，由 Vue overlay 负责渲染
      if (this.expandedRowKeys.has(row.id)) {
        const expandY = y + this.options.rowHeight;
        const expandH = h - this.options.rowHeight;
        
        // 只绘制展开区域的背景和边框，不绘制内容
        this.ctx.fillStyle = '#fdfdfd';
        this.ctx.fillRect(this.fixedLeftWidth, expandY, this.width - this.fixedLeftWidth, expandH);
        if (this.options.border) {
          this.ctx.strokeStyle = '#ebeef5';
          this.ctx.beginPath();
          this.ctx.moveTo(this.fixedLeftWidth, expandY);
          this.ctx.lineTo(this.width, expandY);
          this.ctx.stroke();
        }
      }
    }

    // Draw merged cells at the end to be on top
    mergedCellsToDraw.forEach(({ col, val, x, y, w, h, r, bgColor }) => {
      this.ctx.fillStyle = bgColor;
      this.ctx.fillRect(x, y, w, h);
      this.drawCell(col, val, x, y, w, h, r);
      if (this.options.border) {
        this.ctx.strokeStyle = '#ebeef5';
        this.ctx.strokeRect(x + 0.5, y + 0.5, w, h);
      }
    });

    this.ctx.restore();
  }

  private drawFixedLeftBody() {
    const { headerHeight } = this.options;
    const { startRow, endRow } = this.getRowRange();
    const summaryHeight = this.summaryRows.length * this.options.rowHeight;

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(0, headerHeight, this.fixedLeftWidth, this.height - headerHeight - summaryHeight);
    this.ctx.clip();

    const processedCells = new Set<string>();
    const mergedCellsToDraw: Array<{ col: ColumnConfig, val: any, x: number, y: number, w: number, h: number, r: number, c: number, bgColor: string }> = [];

    for (let i = startRow; i < endRow; i++) {
      const row = this.data[i];
      if (!row) continue;
      const y = (this.rowOffsets[i] ?? 0) - this.scrollY + headerHeight;

      const rowBgColor = i % 2 === 1 && this.options.stripe ? '#fafafa' : '#fff';

      this.flattenedColumns.forEach((col, j) => {
        if (!(col.fixed === 'left' || col.fixed === true)) return;
        if (processedCells.has(`${i},${j}`)) return;

        const x = (this.columnPositions[j] ?? 0);
        const w = (this.columnPositions[j+1] ?? 0) - (this.columnPositions[j] ?? 0);

        const span = this.options.spanMethod({ row: i, column: col, rowIndex: i, columnIndex: j });
        if (span) {
          const { rowspan, colspan } = span;
          if (rowspan === 0 || colspan === 0) return;
          const spanW = (this.columnPositions[j + colspan] ?? this.fixedLeftWidth) - (this.columnPositions[j] ?? 0);
          const spanH = (this.rowOffsets[i + rowspan] ?? this.totalHeight) - (this.rowOffsets[i] ?? 0);
          
          for (let r = 0; r < rowspan; r++) {
            for (let c = 0; c < colspan; c++) {
              processedCells.add(`${i + r},${j + c}`);
            }
          }
          
          mergedCellsToDraw.push({ col, val: row[col.key || ''], x, y, w: spanW, h: spanH, r: i, c: j, bgColor: rowBgColor });
        } else {
          this.ctx.fillStyle = rowBgColor;
          this.ctx.fillRect(x, y, w, this.options.rowHeight);

          this.drawCell(col, row[col.key || ''], x, y, w, this.options.rowHeight, i);
          if (this.options.border) {
            this.ctx.strokeStyle = '#ebeef5';
            this.ctx.strokeRect(x + 0.5, y + 0.5, w, this.options.rowHeight);
          }
        }
      });
    }

    // Draw merged cells at the end to be on top
    mergedCellsToDraw.forEach(({ col, val, x, y, w, h, r, bgColor }) => {
      this.ctx.fillStyle = bgColor;
      this.ctx.fillRect(x, y, w, h);
      this.drawCell(col, val, x, y, w, h, r);
      if (this.options.border) {
        this.ctx.strokeStyle = '#ebeef5';
        this.ctx.strokeRect(x + 0.5, y + 0.5, w, h);
      }
    });

    this.ctx.restore();
  }

  private drawSummaryRows() {
    if (this.summaryRows.length === 0) return;
    const { rowHeight } = this.options;
    const summaryHeight = this.summaryRows.length * rowHeight;
    const startY = this.height - summaryHeight;

    this.ctx.save();
    this.ctx.fillStyle = '#fdf6ec';
    this.ctx.fillRect(0, startY, this.width, summaryHeight);

    // Calculate label colspan (merge selection, expand, id columns if they are at the start)
    let labelColSpan = 0;
    for (let j = 0; j < this.flattenedColumns.length; j++) {
      const col = this.flattenedColumns[j];
      if (col && (col.type === 'selection' || col.type === 'expand' || col.key === 'id')) {
        labelColSpan++;
      } else {
        break;
      }
    }
    if (labelColSpan === 0) labelColSpan = 1;

    this.summaryRows.forEach((row, i) => {
      const y = startY + i * rowHeight;
      
      // Scrolling part
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.rect(this.fixedLeftWidth, y, this.width - this.fixedLeftWidth, rowHeight);
      this.ctx.clip();
      this.flattenedColumns.forEach((col, j) => {
        if (col.fixed === 'left' || col.fixed === true) return;
        if (j < labelColSpan) return; // Skip columns covered by label
        
        const x = (this.columnPositions[j] ?? 0) - this.scrollX;
        const w = (this.columnPositions[j+1] ?? 0) - (this.columnPositions[j] ?? 0);
        
        this.drawTextCell(row[j], x, y, w, rowHeight, col.align);

        if (this.options.border) {
          this.ctx.strokeStyle = '#ebeef5';
          this.ctx.strokeRect(x + 0.5, y + 0.5, w, rowHeight);
        }
      });
      this.ctx.restore();

      // Fixed part
      this.flattenedColumns.forEach((col, j) => {
        if (col.fixed === 'left' || col.fixed === true) {
          const x = (this.columnPositions[j] ?? 0);
          const w = (this.columnPositions[j+1] ?? 0) - (this.columnPositions[j] ?? 0);
          
          if (j === 0) {
            // Draw merged label
            const labelW = (this.columnPositions[labelColSpan] ?? this.fixedLeftWidth) - (this.columnPositions[0] ?? 0);
            this.ctx.save();
            this.ctx.font = 'bold 13px sans-serif';
            this.ctx.fillStyle = '#e6a23c';
            this.drawTextCell(row[0], x, y, labelW, rowHeight, 'center');
            this.ctx.restore();
            
            if (this.options.border) {
              this.ctx.strokeStyle = '#ebeef5';
              this.ctx.strokeRect(x + 0.5, y + 0.5, labelW, rowHeight);
            }
          } else if (j < labelColSpan) {
            // Skip columns covered by label
            return;
          } else {
            this.drawTextCell(row[j], x, y, w, rowHeight, col.align);
            if (this.options.border) {
              this.ctx.strokeStyle = '#ebeef5';
              this.ctx.strokeRect(x + 0.5, y + 0.5, w, rowHeight);
            }
          }
        }
      });
    });
    this.ctx.restore();
  }

  private drawCell(col: ColumnConfig, value: any, x: number, y: number, w: number, h: number, rowIndex: number) {
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(x, y, w, h);
    this.ctx.clip();

    // Use custom renderer if provided
    if (col.renderCell) {
      // In a real Canvas app, renderCell might need to return a VNode that we render as an overlay
      // For now, we'll draw a placeholder or the text if possible
      this.drawTextCell(value, x, y, w, h, col.align);
    } else {
      switch (col.type) {
        case 'expand':
          this.drawExpandButton(x + (w - 16) / 2, y + (this.options.rowHeight - 16) / 2, this.expandedRowKeys.has(this.data[rowIndex]?.id ?? ''));
          break;
        case 'selection':
          const isSelected = this.selectedRowKeys.has(this.data[rowIndex]?.id ?? '');
          this.drawCheckboxCell(isSelected, x, y, w, this.options.rowHeight, 'center');
          break;
        case 'image':
          this.drawImageCell(value, x, y, w, h, col.align);
          break;
        case 'checkbox':
          this.drawCheckboxCell(value, x, y, w, h, col.align);
          break;
        case 'radio':
          this.drawRadioCell(value, x, y, w, h, col.align);
          break;
        case 'switch':
          this.drawSwitchCell(value, x, y, w, h, col.align);
          break;
        case 'color-picker':
          this.drawColorPickerCell(value, x, y, w, h, col.align);
          break;
        case 'tags':
          this.drawTagsCell(value, x, y, w, h);
          break;
        case 'text':
        default:
          this.drawTextCell(value, x, y, w, h, col.align);
          break;
      }
    }
    this.ctx.restore();
  }

  private drawExpandButton(x: number, y: number, isExpanded: boolean) {
    this.ctx.save();
    this.ctx.translate(x + 8, y + 8);
    if (isExpanded) {
      this.ctx.rotate(Math.PI / 2);
    }
    this.ctx.strokeStyle = '#909399';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(-3, -5);
    this.ctx.lineTo(3, 0);
    this.ctx.lineTo(-3, 5);
    this.ctx.stroke();
    this.ctx.restore();
  }

  private drawTextCell(value: any, x: number, y: number, w: number, h: number, align?: string) {
    this.ctx.fillStyle = '#606266';
    this.ctx.font = '14px sans-serif';
    this.ctx.textAlign = (align as any) || 'left';
    this.ctx.textBaseline = 'middle';
    
    let textX = x + 10;
    if (align === 'center') textX = x + w / 2;
    if (align === 'right') textX = x + w - 10;

    const cellValue = value === undefined || value === null ? '' : String(value);
    this.ctx.fillText(cellValue, textX, y + h / 2);
  }

  private drawImageCell(value: any, x: number, y: number, w: number, h: number, align?: string) {
    if (!value) return;
    const src = String(value);
    const size = Math.min(w, h) - 10;
    let imgX = x + 5;
    if (align === 'center') imgX = x + (w - size) / 2;
    if (align === 'right') imgX = x + w - size - 5;
    
    let img = this.imageCache.get(src);
    if (!img) {
      img = new Image();
      img.src = src;
      this.imageCache.set(src, img);
      img.onload = () => this.render();
      img.onerror = () => {
        console.error(`Failed to load image: ${src}`);
        this.imageCache.delete(src);
      };
    }

    if (img.complete && img.naturalWidth > 0) {
      this.ctx.drawImage(img, imgX, y + (h - size) / 2, size, size);
    } else {
      // Placeholder
      this.ctx.fillStyle = '#f5f7fa';
      this.ctx.fillRect(imgX, y + (h - size) / 2, size, size);
    }
  }

  private drawCheckboxCell(value: any, x: number, y: number, w: number, h: number, align?: string) {
    const size = 16;
    let rectX = x + 10;
    if (align === 'center') rectX = x + (w - size) / 2;
    if (align === 'right') rectX = x + w - size - 10;
    
    const rectY = y + (h - size) / 2;
    
    this.ctx.strokeStyle = value ? '#409eff' : '#dcdfe6';
    this.ctx.fillStyle = value ? '#409eff' : '#fff';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(rectX + 0.5, rectY + 0.5, size, size);
    if (value) {
      this.ctx.fillRect(rectX + 1, rectY + 1, size - 1, size - 1);
      // Draw checkmark
      this.ctx.strokeStyle = '#fff';
      this.ctx.beginPath();
      this.ctx.moveTo(rectX + 4, rectY + 8);
      this.ctx.lineTo(rectX + 7, rectY + 11);
      this.ctx.lineTo(rectX + 12, rectY + 5);
      this.ctx.stroke();
    }
  }

  private drawRadioCell(value: any, x: number, y: number, w: number, h: number, align?: string) {
    const size = 16;
    let rectX = x + 10;
    if (align === 'center') rectX = x + (w - size) / 2;
    if (align === 'right') rectX = x + w - size - 10;
    const rectY = y + (h - size) / 2;
    
    const centerX = rectX + size / 2;
    const centerY = rectY + size / 2;
    
    this.ctx.strokeStyle = value ? '#409eff' : '#dcdfe6';
    this.ctx.fillStyle = '#fff';
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, size / 2, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.fill();
    
    if (value) {
      this.ctx.fillStyle = '#409eff';
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, size / 4, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawSwitchCell(value: any, x: number, y: number, w: number, h: number, align?: string) {
    const swWidth = 32;
    const swHeight = 16;
    let rectX = x + 10;
    if (align === 'center') rectX = x + (w - swWidth) / 2;
    if (align === 'right') rectX = x + w - swWidth - 10;
    const rectY = y + (h - swHeight) / 2;

    this.ctx.fillStyle = value ? '#13ce66' : '#ff4949';
    this.ctx.beginPath();
    this.ctx.roundRect?.(rectX, rectY, swWidth, swHeight, swHeight / 2);
    this.ctx.fill();
    
    this.ctx.fillStyle = '#fff';
    this.ctx.beginPath();
    const knobX = value ? rectX + swWidth - swHeight + 2 : rectX + 2;
    this.ctx.arc(knobX + (swHeight - 4) / 2, rectY + swHeight / 2, (swHeight - 4) / 2, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawColorPickerCell(value: any, x: number, y: number, w: number, h: number, align?: string) {
    const size = 20;
    let rectX = x + 10;
    if (align === 'center') rectX = x + (w - size) / 2;
    if (align === 'right') rectX = x + w - size - 10;
    const rectY = y + (h - size) / 2;
    
    this.ctx.fillStyle = value || '#000';
    this.ctx.fillRect(rectX, rectY, size, size);
    this.ctx.strokeStyle = '#dcdfe6';
    this.ctx.strokeRect(rectX + 0.5, rectY + 0.5, size, size);
  }

  private drawTagsCell(value: any[], x: number, y: number, w: number, h: number) {
    if (!Array.isArray(value)) return;
    let currentX = x + 5;
    const tagHeight = 20;
    const tagPadding = 5;

    const fontSize = 12
    
    value.forEach(tag => {
      const text = String(tag);
      this.ctx.font = `${fontSize}px sans-serif`;
      const textWidth = this.ctx.measureText(text).width;
      const tagWidth = textWidth + tagPadding * 2;
      
      if (currentX + tagWidth > x + w - 5) return; // Basic overflow handling

      const tagY = y + (h - tagHeight) / 2;
      this.ctx.fillStyle = '#ecf5ff';
      this.ctx.strokeStyle = '#d9ecff';
      this.ctx.beginPath();
      this.ctx.roundRect?.(currentX, tagY, tagWidth, tagHeight, 4);
      this.ctx.fill();
      this.ctx.stroke();
      
      this.ctx.fillStyle = '#409eff';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(text, currentX + tagWidth / 2, tagY + tagHeight - fontSize / 2);
      
      currentX += tagWidth + 5;
    });
  }

  public getCellAt(x: number, y: number): CellInfo | null {
    const { headerHeight } = this.options;
    if (y < headerHeight) return null;

    const { startRow, endRow } = this.getRowRange();
    for (let i = startRow; i < endRow; i++) {
      const row = this.data[i];
      if (!row) continue;
      const cellY = (this.rowOffsets[i] ?? 0) - this.scrollY + headerHeight;
      const cellH = (this.rowOffsets[i+1] ?? 0) - (this.rowOffsets[i] ?? 0);

      if (y >= cellY && y < cellY + cellH) {
        // Check columns
        for (let j = 0; j < this.flattenedColumns.length; j++) {
          const column = this.flattenedColumns[j]!;
          const w = (this.columnPositions[j+1] ?? 0) - (this.columnPositions[j] ?? 0);
          
          let cellX = 0;
          if (column.fixed === 'left' || column.fixed === true) {
            cellX = this.columnPositions[j] ?? 0;
          } else {
            cellX = (this.columnPositions[j] ?? 0) - this.scrollX;
            if (cellX < this.fixedLeftWidth) continue;
          }

          if (x >= cellX && x < cellX + w) {
            const isExpandBtn = column.type === 'expand';
            const isSelection = column.type === 'selection';

            return {
              row: i,
              col: j,
              rect: { x: cellX, y: cellY, width: w, height: cellH },
              column,
              data: row,
              isExpandBtn,
              isSelection
            };
          }
        }
      }
    }
    return null;
  }

  public getRowOffsets() { return this.rowOffsets; }
  public getScrollX() { return this.scrollX; }
  public getScrollY() { return this.scrollY; }
  public getFixedLeftWidth() { return this.fixedLeftWidth; }
  public getTotalWidth() { return this.totalWidth; }
  public getTotalHeight() { return this.totalHeight; }
}

