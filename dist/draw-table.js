import { defineComponent as q, computed as _, openBlock as L, createElementBlock as W, normalizeStyle as B, Fragment as D, renderList as F, withModifiers as Y, normalizeClass as bt, createElementVNode as H, createCommentVNode as X, toDisplayString as G, ref as b, shallowRef as St, onMounted as Ht, onUnmounted as Lt, watch as J, createBlock as U, resolveDynamicComponent as Et, Teleport as Wt, createVNode as Pt, unref as zt, h as A } from "vue";
class $t {
  ctx;
  canvas;
  columns = [];
  data = [];
  options = {
    rowHeight: 40,
    headerHeight: 48,
    border: !0,
    stripe: !0,
    multiSelect: !1,
    fixedHeader: !0,
    renderExpand: () => null,
    spanMethod: () => {
    }
  };
  scrollX = 0;
  scrollY = 0;
  width = 0;
  height = 0;
  // Layout info
  columnPositions = [];
  rowOffsets = [];
  totalWidth = 0;
  totalHeight = 0;
  fixedLeftWidth = 0;
  summaryRows = [];
  expandedRowKeys = /* @__PURE__ */ new Set();
  selectedRowKeys = /* @__PURE__ */ new Set();
  imageCache = /* @__PURE__ */ new Map();
  flattenedColumns = [];
  columnLevels = 0;
  constructor(t) {
    this.canvas = t;
    const s = t.getContext("2d");
    if (!s) throw new Error("Could not get canvas context");
    this.ctx = s;
  }
  destroy() {
    this.imageCache.forEach((t) => {
      t.onload = null, t.onerror = null, t.src = "";
    }), this.imageCache.clear(), this.data = [], this.columns = [], this.summaryRows = [];
  }
  setExpandedRows(t) {
    this.expandedRowKeys = new Set(t), this.calculateLayout(), this.render();
  }
  setData(t) {
    this.data = t, this.calculateLayout(), this.render();
  }
  setColumns(t) {
    this.columns = t, this.flattenColumns(), this.calculateLayout(), this.render();
  }
  flattenColumns() {
    this.flattenedColumns = [], this.columnLevels = 0;
    const t = (i, h = 0) => {
      this.columnLevels = Math.max(this.columnLevels, h + 1), i.forEach((a) => {
        a.children && a.children.length > 0 ? t(a.children, h + 1) : this.flattenedColumns.push(a);
      });
    };
    t(this.columns);
    const s = 40;
    this.columnLevels > 1 ? this.options.headerHeight = this.columnLevels * s : this.options.headerHeight = 48;
  }
  setOptions(t) {
    this.options = { ...this.options, ...t }, this.calculateLayout(), this.render();
  }
  resize(t, s) {
    this.width = t, this.height = s;
    const i = window.devicePixelRatio || 1;
    this.canvas.width = t * i, this.canvas.height = s * i, this.canvas.style.width = `${t}px`, this.canvas.style.height = `${s}px`, this.ctx.resetTransform(), this.ctx.scale(i, i), this.render();
  }
  scrollTo(t, s) {
    this.scrollX = t, this.scrollY = s, this.render();
  }
  calculateLayout() {
    let t = 0;
    this.columnPositions = [0];
    let s = 0;
    this.flattenedColumns.forEach((a) => {
      const n = a.width || 100;
      t += n, this.columnPositions.push(t), (a.fixed === "left" || a.fixed === !0) && (s = t);
    }), this.totalWidth = t, this.fixedLeftWidth = s;
    let i = 0;
    this.rowOffsets = [0];
    const { rowHeight: h } = this.options;
    this.data.forEach((a) => {
      i += h, this.expandedRowKeys.has(a.id) && (i += h * 3), this.rowOffsets.push(i);
    }), this.totalHeight = i, this.calculateSummaries();
  }
  getRowRange(t = 20) {
    const { headerHeight: s } = this.options, i = this.summaryRows.length * this.options.rowHeight, h = this.height - s - i, a = this.scrollY, n = a + h;
    let l = 0;
    for (; l < this.rowOffsets.length && (this.rowOffsets[l + 1] ?? 0) < a; )
      l++;
    let r = l;
    for (; r < this.rowOffsets.length && (this.rowOffsets[r] ?? 0) < n; )
      r++;
    return {
      startRow: Math.max(0, l - t),
      endRow: Math.min(this.data.length, r + 1)
    };
  }
  calculateSummaries() {
    this.summaryRows = [];
    const t = /* @__PURE__ */ new Map();
    this.flattenedColumns.forEach((s, i) => {
      s.summary && s.summary.forEach((h) => {
        try {
          const a = h(this.data);
          if (a && a.label) {
            const { label: n, value: l } = a;
            t.has(n) || t.set(n, new Array(this.flattenedColumns.length).fill("")), t.get(n)[i] = l;
          }
        } catch (a) {
          console.error("Summary calculation error:", a);
        }
      });
    }), t.forEach((s, i) => {
      s[0] = i, this.summaryRows.push(s);
    });
  }
  render() {
    this.ctx.clearRect(0, 0, this.width, this.height), this.drawBody(), this.drawFixedLeftBody(), this.drawSummaryRows();
  }
  getColumnWidth(t) {
    return t.children && t.children.length > 0 ? t.children.reduce((i, h) => i + this.getColumnWidth(h), 0) : t.width || 100;
  }
  setSelectedRows(t) {
    this.selectedRowKeys = new Set(t), this.render();
  }
  drawBody() {
    const { headerHeight: t } = this.options, { startRow: s, endRow: i } = this.getRowRange(), h = this.summaryRows.length * this.options.rowHeight;
    this.ctx.save(), this.ctx.beginPath(), this.ctx.rect(this.fixedLeftWidth, t, this.width - this.fixedLeftWidth, this.height - t - h), this.ctx.clip();
    const a = /* @__PURE__ */ new Set(), n = [];
    for (let l = s; l < i; l++) {
      const r = this.data[l];
      if (!r) continue;
      const e = (this.rowOffsets[l] ?? 0) - this.scrollY + t, f = (this.rowOffsets[l + 1] ?? 0) - (this.rowOffsets[l] ?? 0), v = l % 2 === 1 && this.options.stripe ? "#fafafa" : "#fff";
      if (this.flattenedColumns.forEach((g, c) => {
        if (g.fixed === "left" || g.fixed === !0 || a.has(`${l},${c}`)) return;
        const x = (this.columnPositions[c] ?? 0) - this.scrollX, y = (this.columnPositions[c + 1] ?? 0) - (this.columnPositions[c] ?? 0), p = this.options.spanMethod({ row: l, column: g, rowIndex: l, columnIndex: c });
        if (p) {
          const { rowspan: m, colspan: R } = p;
          if (m === 0 || R === 0) return;
          const P = (this.columnPositions[c + R] ?? this.totalWidth) - (this.columnPositions[c] ?? 0), C = (this.rowOffsets[l + m] ?? this.totalHeight) - (this.rowOffsets[l] ?? 0);
          for (let S = 0; S < m; S++)
            for (let T = 0; T < R; T++)
              a.add(`${l + S},${c + T}`);
          n.push({ col: g, val: r[g.key || ""], x, y: e, w: P, h: C, r: l, c, bgColor: v });
        } else
          this.ctx.fillStyle = v, this.ctx.fillRect(x, e, y, this.options.rowHeight), this.drawCell(g, r[g.key || ""], x, e, y, this.options.rowHeight, l), this.options.border && (this.ctx.strokeStyle = "#ebeef5", this.ctx.strokeRect(x + 0.5, e + 0.5, y, this.options.rowHeight));
      }), this.expandedRowKeys.has(r.id)) {
        const g = e + this.options.rowHeight, c = f - this.options.rowHeight;
        this.ctx.fillStyle = "#fdfdfd", this.ctx.fillRect(this.fixedLeftWidth, g, this.width - this.fixedLeftWidth, c), this.options.border && (this.ctx.strokeStyle = "#ebeef5", this.ctx.beginPath(), this.ctx.moveTo(this.fixedLeftWidth, g), this.ctx.lineTo(this.width, g), this.ctx.stroke());
      }
    }
    n.forEach(({ col: l, val: r, x: e, y: f, w: v, h: g, r: c, bgColor: x }) => {
      this.ctx.fillStyle = x, this.ctx.fillRect(e, f, v, g), this.drawCell(l, r, e, f, v, g, c), this.options.border && (this.ctx.strokeStyle = "#ebeef5", this.ctx.strokeRect(e + 0.5, f + 0.5, v, g));
    }), this.ctx.restore();
  }
  drawFixedLeftBody() {
    const { headerHeight: t } = this.options, { startRow: s, endRow: i } = this.getRowRange(), h = this.summaryRows.length * this.options.rowHeight;
    this.ctx.save(), this.ctx.beginPath(), this.ctx.rect(0, t, this.fixedLeftWidth, this.height - t - h), this.ctx.clip();
    const a = /* @__PURE__ */ new Set(), n = [];
    for (let l = s; l < i; l++) {
      const r = this.data[l];
      if (!r) continue;
      const e = (this.rowOffsets[l] ?? 0) - this.scrollY + t, f = l % 2 === 1 && this.options.stripe ? "#fafafa" : "#fff";
      this.flattenedColumns.forEach((v, g) => {
        if (!(v.fixed === "left" || v.fixed === !0) || a.has(`${l},${g}`)) return;
        const c = this.columnPositions[g] ?? 0, x = (this.columnPositions[g + 1] ?? 0) - (this.columnPositions[g] ?? 0), y = this.options.spanMethod({ row: l, column: v, rowIndex: l, columnIndex: g });
        if (y) {
          const { rowspan: p, colspan: m } = y;
          if (p === 0 || m === 0) return;
          const R = (this.columnPositions[g + m] ?? this.fixedLeftWidth) - (this.columnPositions[g] ?? 0), P = (this.rowOffsets[l + p] ?? this.totalHeight) - (this.rowOffsets[l] ?? 0);
          for (let C = 0; C < p; C++)
            for (let S = 0; S < m; S++)
              a.add(`${l + C},${g + S}`);
          n.push({ col: v, val: r[v.key || ""], x: c, y: e, w: R, h: P, r: l, c: g, bgColor: f });
        } else
          this.ctx.fillStyle = f, this.ctx.fillRect(c, e, x, this.options.rowHeight), this.drawCell(v, r[v.key || ""], c, e, x, this.options.rowHeight, l), this.options.border && (this.ctx.strokeStyle = "#ebeef5", this.ctx.strokeRect(c + 0.5, e + 0.5, x, this.options.rowHeight));
      });
    }
    n.forEach(({ col: l, val: r, x: e, y: f, w: v, h: g, r: c, bgColor: x }) => {
      this.ctx.fillStyle = x, this.ctx.fillRect(e, f, v, g), this.drawCell(l, r, e, f, v, g, c), this.options.border && (this.ctx.strokeStyle = "#ebeef5", this.ctx.strokeRect(e + 0.5, f + 0.5, v, g));
    }), this.ctx.restore();
  }
  drawSummaryRows() {
    if (this.summaryRows.length === 0) return;
    const { rowHeight: t } = this.options, s = this.summaryRows.length * t, i = this.height - s;
    this.ctx.save(), this.ctx.fillStyle = "#fdf6ec", this.ctx.fillRect(0, i, this.width, s);
    let h = 0;
    for (let a = 0; a < this.flattenedColumns.length; a++) {
      const n = this.flattenedColumns[a];
      if (n && (n.type === "selection" || n.type === "expand" || n.key === "id"))
        h++;
      else
        break;
    }
    h === 0 && (h = 1), this.summaryRows.forEach((a, n) => {
      const l = i + n * t;
      this.ctx.save(), this.ctx.beginPath(), this.ctx.rect(this.fixedLeftWidth, l, this.width - this.fixedLeftWidth, t), this.ctx.clip(), this.flattenedColumns.forEach((r, e) => {
        if (r.fixed === "left" || r.fixed === !0 || e < h) return;
        const f = (this.columnPositions[e] ?? 0) - this.scrollX, v = (this.columnPositions[e + 1] ?? 0) - (this.columnPositions[e] ?? 0);
        this.drawTextCell(a[e], f, l, v, t, r.align), this.options.border && (this.ctx.strokeStyle = "#ebeef5", this.ctx.strokeRect(f + 0.5, l + 0.5, v, t));
      }), this.ctx.restore(), this.flattenedColumns.forEach((r, e) => {
        if (r.fixed === "left" || r.fixed === !0) {
          const f = this.columnPositions[e] ?? 0, v = (this.columnPositions[e + 1] ?? 0) - (this.columnPositions[e] ?? 0);
          if (e === 0) {
            const g = (this.columnPositions[h] ?? this.fixedLeftWidth) - (this.columnPositions[0] ?? 0);
            this.ctx.save(), this.ctx.font = "bold 13px sans-serif", this.ctx.fillStyle = "#e6a23c", this.drawTextCell(a[0], f, l, g, t, "center"), this.ctx.restore(), this.options.border && (this.ctx.strokeStyle = "#ebeef5", this.ctx.strokeRect(f + 0.5, l + 0.5, g, t));
          } else {
            if (e < h)
              return;
            this.drawTextCell(a[e], f, l, v, t, r.align), this.options.border && (this.ctx.strokeStyle = "#ebeef5", this.ctx.strokeRect(f + 0.5, l + 0.5, v, t));
          }
        }
      });
    }), this.ctx.restore();
  }
  drawCell(t, s, i, h, a, n, l) {
    if (this.ctx.save(), this.ctx.beginPath(), this.ctx.rect(i, h, a, n), this.ctx.clip(), t.renderCell)
      this.drawTextCell(s, i, h, a, n, t.align);
    else
      switch (t.type) {
        case "expand":
          this.drawExpandButton(i + (a - 16) / 2, h + (this.options.rowHeight - 16) / 2, this.expandedRowKeys.has(this.data[l]?.id ?? ""));
          break;
        case "selection":
          const r = this.selectedRowKeys.has(this.data[l]?.id ?? "");
          this.drawCheckboxCell(r, i, h, a, this.options.rowHeight, "center");
          break;
        case "image":
          this.drawImageCell(s, i, h, a, n, t.align);
          break;
        case "checkbox":
          this.drawCheckboxCell(s, i, h, a, n, t.align);
          break;
        case "radio":
          this.drawRadioCell(s, i, h, a, n, t.align);
          break;
        case "switch":
          this.drawSwitchCell(s, i, h, a, n, t.align);
          break;
        case "color-picker":
          this.drawColorPickerCell(s, i, h, a, n, t.align);
          break;
        case "tags":
          this.drawTagsCell(s, i, h, a, n);
          break;
        default:
          this.drawTextCell(s, i, h, a, n, t.align);
          break;
      }
    this.ctx.restore();
  }
  drawExpandButton(t, s, i) {
    this.ctx.save(), this.ctx.translate(t + 8, s + 8), i && this.ctx.rotate(Math.PI / 2), this.ctx.strokeStyle = "#909399", this.ctx.lineWidth = 2, this.ctx.beginPath(), this.ctx.moveTo(-3, -5), this.ctx.lineTo(3, 0), this.ctx.lineTo(-3, 5), this.ctx.stroke(), this.ctx.restore();
  }
  drawTextCell(t, s, i, h, a, n) {
    this.ctx.fillStyle = "#606266", this.ctx.font = "14px sans-serif", this.ctx.textAlign = n || "left", this.ctx.textBaseline = "middle";
    let l = s + 10;
    n === "center" && (l = s + h / 2), n === "right" && (l = s + h - 10);
    const r = t == null ? "" : String(t);
    this.ctx.fillText(r, l, i + a / 2);
  }
  drawImageCell(t, s, i, h, a, n) {
    if (!t) return;
    const l = String(t), r = Math.min(h, a) - 10;
    let e = s + 5;
    n === "center" && (e = s + (h - r) / 2), n === "right" && (e = s + h - r - 5);
    let f = this.imageCache.get(l);
    f || (f = new Image(), f.src = l, this.imageCache.set(l, f), f.onload = () => this.render(), f.onerror = () => {
      console.error(`Failed to load image: ${l}`), this.imageCache.delete(l);
    }), f.complete && f.naturalWidth > 0 ? this.ctx.drawImage(f, e, i + (a - r) / 2, r, r) : (this.ctx.fillStyle = "#f5f7fa", this.ctx.fillRect(e, i + (a - r) / 2, r, r));
  }
  drawCheckboxCell(t, s, i, h, a, n) {
    let r = s + 10;
    n === "center" && (r = s + (h - 16) / 2), n === "right" && (r = s + h - 16 - 10);
    const e = i + (a - 16) / 2;
    this.ctx.strokeStyle = t ? "#409eff" : "#dcdfe6", this.ctx.fillStyle = t ? "#409eff" : "#fff", this.ctx.lineWidth = 1, this.ctx.strokeRect(r + 0.5, e + 0.5, 16, 16), t && (this.ctx.fillRect(r + 1, e + 1, 15, 15), this.ctx.strokeStyle = "#fff", this.ctx.beginPath(), this.ctx.moveTo(r + 4, e + 8), this.ctx.lineTo(r + 7, e + 11), this.ctx.lineTo(r + 12, e + 5), this.ctx.stroke());
  }
  drawRadioCell(t, s, i, h, a, n) {
    let r = s + 10;
    n === "center" && (r = s + (h - 16) / 2), n === "right" && (r = s + h - 16 - 10);
    const e = i + (a - 16) / 2, f = r + 16 / 2, v = e + 16 / 2;
    this.ctx.strokeStyle = t ? "#409eff" : "#dcdfe6", this.ctx.fillStyle = "#fff", this.ctx.beginPath(), this.ctx.arc(f, v, 16 / 2, 0, Math.PI * 2), this.ctx.stroke(), this.ctx.fill(), t && (this.ctx.fillStyle = "#409eff", this.ctx.beginPath(), this.ctx.arc(f, v, 16 / 4, 0, Math.PI * 2), this.ctx.fill());
  }
  drawSwitchCell(t, s, i, h, a, n) {
    let e = s + 10;
    n === "center" && (e = s + (h - 32) / 2), n === "right" && (e = s + h - 32 - 10);
    const f = i + (a - 16) / 2;
    this.ctx.fillStyle = t ? "#13ce66" : "#ff4949", this.ctx.beginPath(), this.ctx.roundRect?.(e, f, 32, 16, 16 / 2), this.ctx.fill(), this.ctx.fillStyle = "#fff", this.ctx.beginPath();
    const v = t ? e + 32 - 16 + 2 : e + 2;
    this.ctx.arc(v + 12 / 2, f + 16 / 2, 12 / 2, 0, Math.PI * 2), this.ctx.fill();
  }
  drawColorPickerCell(t, s, i, h, a, n) {
    let r = s + 10;
    n === "center" && (r = s + (h - 20) / 2), n === "right" && (r = s + h - 20 - 10);
    const e = i + (a - 20) / 2;
    this.ctx.fillStyle = t || "#000", this.ctx.fillRect(r, e, 20, 20), this.ctx.strokeStyle = "#dcdfe6", this.ctx.strokeRect(r + 0.5, e + 0.5, 20, 20);
  }
  drawTagsCell(t, s, i, h, a) {
    if (!Array.isArray(t)) return;
    let n = s + 5;
    const l = 20, r = 5, e = 12;
    t.forEach((f) => {
      const v = String(f);
      this.ctx.font = `${e}px sans-serif`;
      const c = this.ctx.measureText(v).width + r * 2;
      if (n + c > s + h - 5) return;
      const x = i + (a - l) / 2;
      this.ctx.fillStyle = "#ecf5ff", this.ctx.strokeStyle = "#d9ecff", this.ctx.beginPath(), this.ctx.roundRect?.(n, x, c, l, 4), this.ctx.fill(), this.ctx.stroke(), this.ctx.fillStyle = "#409eff", this.ctx.textAlign = "center", this.ctx.fillText(v, n + c / 2, x + l - e / 2), n += c + 5;
    });
  }
  getCellAt(t, s) {
    const { headerHeight: i } = this.options;
    if (s < i) return null;
    const { startRow: h, endRow: a } = this.getRowRange();
    for (let n = h; n < a; n++) {
      const l = this.data[n];
      if (!l) continue;
      const r = (this.rowOffsets[n] ?? 0) - this.scrollY + i, e = (this.rowOffsets[n + 1] ?? 0) - (this.rowOffsets[n] ?? 0);
      if (s >= r && s < r + e)
        for (let f = 0; f < this.flattenedColumns.length; f++) {
          const v = this.flattenedColumns[f], g = (this.columnPositions[f + 1] ?? 0) - (this.columnPositions[f] ?? 0);
          let c = 0;
          if (v.fixed === "left" || v.fixed === !0)
            c = this.columnPositions[f] ?? 0;
          else if (c = (this.columnPositions[f] ?? 0) - this.scrollX, c < this.fixedLeftWidth) continue;
          if (t >= c && t < c + g) {
            const x = v.type === "expand", y = v.type === "selection";
            return {
              row: n,
              col: f,
              rect: { x: c, y: r, width: g, height: e },
              column: v,
              data: l,
              isExpandBtn: x,
              isSelection: y
            };
          }
        }
    }
    return null;
  }
  getRowOffsets() {
    return this.rowOffsets;
  }
  getScrollX() {
    return this.scrollX;
  }
  getScrollY() {
    return this.scrollY;
  }
  getFixedLeftWidth() {
    return this.fixedLeftWidth;
  }
  getTotalWidth() {
    return this.totalWidth;
  }
  getTotalHeight() {
    return this.totalHeight;
  }
}
const Tt = ["onClick", "onMouseenter"], Mt = { class: "header-cell-content" }, Bt = ["checked", ".indeterminate"], _t = { class: "header-title" }, Xt = ["onClick"], Yt = /* @__PURE__ */ q({
  __name: "TableHeader",
  props: {
    columns: {},
    flattenedColumns: {},
    columnLevels: {},
    headerHeight: {},
    scrollX: {},
    fixedLeftWidth: {},
    hoverIndex: {},
    selectedRows: {},
    data: {}
  },
  emits: ["header-hover", "header-leave", "header-click", "header-menu", "toggle-all"],
  setup($, { emit: t }) {
    const s = $, i = t, h = _(() => ({
      height: `${s.headerHeight}px`
    })), a = _(() => {
      const c = [], x = (y, p) => {
        c[p] || (c[p] = []), y.forEach((m) => {
          m.children && m.children.length > 0 ? (c[p] && c[p].push(m), x(m.children, p + 1)) : (c[p] || (c[p] = []), c[p] && c[p].push(m));
        });
      };
      return x(s.columns, 0), c;
    }), n = _(() => s.data.length > 0 && s.selectedRows.size === s.data.length), l = _(() => s.selectedRows.size > 0 && s.selectedRows.size < s.data.length), r = (c, x) => {
      const y = e(c), p = s.columnLevels > 1 ? 40 : s.headerHeight, P = (!c.children || c.children.length === 0 ? s.columnLevels - x : 1) * p, C = f(c), S = c.fixed === "left" || c.fixed === !0 ? C : C - s.scrollX;
      return {
        width: `${y}px`,
        height: `${P}px`,
        left: `${S}px`,
        position: "absolute",
        top: `${x * p}px`
      };
    }, e = (c) => c.children && c.children.length > 0 ? c.children.reduce((x, y) => x + e(y), 0) : c.width || 100, f = (c) => {
      const x = s.flattenedColumns.indexOf(c);
      if (x === -1) {
        const p = (m, R) => {
          for (const P of m) {
            if (P === c) return R;
            if (P.children && P.children.length > 0) {
              const C = p(P.children, R);
              if (C !== -1) return C;
            }
            R += e(P);
          }
          return -1;
        };
        return p(s.columns, 0);
      }
      let y = 0;
      for (let p = 0; p < x; p++)
        y += s.flattenedColumns[p]?.width || 100;
      return y;
    }, v = (c, x) => {
      c.type === "selection" ? i("toggle-all") : i("header-click", c, x);
    }, g = (c, x) => {
      i("header-menu", c, x);
    };
    return (c, x) => (L(), W("div", {
      class: "table-header",
      style: B(h.value),
      onMouseleave: x[1] || (x[1] = (y) => c.$emit("header-leave"))
    }, [
      (L(!0), W(D, null, F(a.value, (y, p) => (L(), W("div", {
        key: p,
        class: "header-level"
      }, [
        (L(!0), W(D, null, F(y, (m) => (L(), W("div", {
          key: m.key,
          class: bt(["header-cell", {
            "fixed-left": m.fixed === "left" || m.fixed === !0,
            hovered: $.hoverIndex === $.flattenedColumns.indexOf(m),
            "has-menu": m.type !== "selection" && m.type !== "expand"
          }]),
          style: B(r(m, p)),
          onClick: Y((R) => v(m, R), ["stop"]),
          onMouseenter: (R) => c.$emit("header-hover", $.flattenedColumns.indexOf(m))
        }, [
          H("div", Mt, [
            m.type === "selection" ? (L(), W("span", {
              key: 0,
              class: "header-checkbox",
              onClick: x[0] || (x[0] = Y((R) => c.$emit("toggle-all"), ["stop"]))
            }, [
              H("input", {
                type: "checkbox",
                checked: n.value,
                ".indeterminate": l.value
              }, null, 40, Bt)
            ])) : X("", !0),
            H("span", _t, G(m.title), 1),
            m.type !== "selection" && m.type !== "expand" ? (L(), W("span", {
              key: 1,
              class: "header-menu-icon",
              onClick: Y((R) => g(m, R), ["stop"])
            }, "•", 8, Xt)) : X("", !0)
          ])
        ], 46, Tt))), 128))
      ]))), 128))
    ], 36));
  }
}), et = ($, t) => {
  const s = $.__vccOpts || $;
  for (const [i, h] of t)
    s[i] = h;
  return s;
}, It = /* @__PURE__ */ et(Yt, [["__scopeId", "data-v-f9ccb2e3"]]), Ot = ["onClick"], At = { class: "icon" }, Dt = { class: "label" }, Ft = { class: "edit-dialog-content" }, Kt = /* @__PURE__ */ q({
  __name: "CanvasTable",
  props: {
    columns: {},
    data: {},
    options: {}
  },
  emits: ["update:data", "select-change", "header-command"],
  setup($, { emit: t }) {
    const s = q({
      props: ["vnode"],
      setup(o) {
        return () => o.vnode;
      }
    }), i = $, h = t, a = b(null), n = b(null), l = b(null), r = b(null), e = St(null), f = b(0), v = b(0), g = b(0), c = b(0), x = b(0), y = b(0), p = b(0), m = b([]), R = b(0), P = b(-1), C = b(null), S = b(null), T = b(null), E = b(/* @__PURE__ */ new Set()), I = b(/* @__PURE__ */ new Set()), M = b(null), st = _(() => ({
      width: "100%",
      height: "100%",
      position: "relative",
      overflow: "hidden"
    })), it = _(() => ({
      position: "absolute",
      top: 0,
      left: 0,
      pointerEvents: "none",
      width: "100%",
      height: "100%",
      zIndex: 5
    })), nt = _(() => {
      if (!C.value) return {};
      const { rect: o } = C.value;
      return {
        position: "absolute",
        left: `${o.x + o.width - 24}px`,
        top: `${o.y + (o.height - 20) / 2}px`,
        pointerEvents: "auto"
      };
    }), lt = _(() => {
      if (!S.value || !n.value) return {};
      const o = n.value.getBoundingClientRect(), { rect: u } = S.value;
      let d = o.top + u.y + u.height + 5, w = o.left + u.x;
      const k = 300;
      return w + k > window.innerWidth && (w = window.innerWidth - k - 20), {
        position: "fixed",
        top: `${d}px`,
        left: `${w}px`,
        zIndex: 2e3,
        pointerEvents: "auto"
      };
    }), ot = _(() => {
      if (!M.value || !n.value) return {};
      const { rect: o } = M.value, u = n.value.getBoundingClientRect();
      return {
        position: "fixed",
        left: `${u.left + o.x + o.width - 120}px`,
        top: `${u.top + o.y + o.height}px`,
        pointerEvents: "auto",
        zIndex: 3e3
      };
    }), at = _(() => {
      if (!M.value) return [];
      const { column: o } = M.value, u = [
        {
          label: "Fix to Left",
          onCommand: (d) => {
            const w = i.columns.findIndex((k) => k.key === d.key);
            i.columns.forEach((k, z) => {
              z <= w && (k.fixed = "left");
            }), e.value?.setColumns(i.columns);
          }
        },
        {
          label: "Unfix",
          onCommand: (d) => {
            d.fixed = !1, e.value?.setColumns(i.columns);
          }
        }
      ];
      return o.renderHeaderMenu ? o.renderHeaderMenu(o, u) : u;
    }), rt = (o) => {
      M.value && (o.onCommand(M.value.column), M.value = null);
    }, ct = (o) => {
      P.value = o;
    }, ht = () => {
      P.value = -1;
    }, dt = () => {
      E.value.size === i.data.length ? E.value.clear() : i.data.forEach((u) => E.value.add(u.id)), e.value?.setSelectedRows(Array.from(E.value)), h("select-change", Array.from(E.value));
    }, ut = (o, u) => {
      const d = u.target.getBoundingClientRect();
      M.value = {
        column: o,
        rect: {
          x: d.left - (n.value?.getBoundingClientRect().left || 0),
          y: d.top - (n.value?.getBoundingClientRect().top || 0),
          width: d.width,
          height: d.height
        }
      };
    }, Q = (o) => {
      if (!n.value || !e.value) return;
      const u = n.value.getBoundingClientRect(), d = o.clientX - u.left, w = o.clientY - u.top;
      C.value = e.value.getCellAt(d, w), C.value && (C.value.isExpandBtn || C.value.isSelection) ? n.value.style.cursor = "pointer" : n.value.style.cursor = "default";
    }, Z = (o) => {
      if (!n.value || !e.value) return;
      const u = n.value.getBoundingClientRect(), d = o.clientX - u.left, w = o.clientY - u.top, k = e.value.getCellAt(d, w);
      if (k) {
        if (k.isExpandBtn) {
          ft(k.data.id);
          return;
        }
        const z = k.data.id;
        if (k.isSelection) {
          E.value.has(z) ? E.value.delete(z) : E.value.add(z), e.value.setSelectedRows(Array.from(E.value)), h("select-change", Array.from(E.value));
          return;
        }
        i.options?.multiSelect ? E.value.has(z) ? E.value.delete(z) : E.value.add(z) : (E.value.clear(), E.value.add(z)), h("select-change", Array.from(E.value));
      }
    }, j = (o) => {
      if (!n.value || !e.value) return;
      const u = n.value.getBoundingClientRect(), d = o.clientX - u.left, w = o.clientY - u.top, k = e.value.getCellAt(d, w);
      k && k.column.renderEdit && tt(k);
    }, tt = (o) => {
      S.value = o, T.value = JSON.parse(JSON.stringify(o.data));
    }, ft = (o) => {
      I.value.has(o) ? I.value.delete(o) : I.value.add(o), e.value?.setExpandedRows(Array.from(I.value)), O();
    }, K = () => {
      S.value = null, T.value = null;
    }, vt = () => {
      if (S.value && T.value) {
        const o = S.value.data.id, u = i.data.findIndex((d) => d.id === o);
        if (u !== -1) {
          const d = [...i.data];
          d[u] = T.value, h("update:data", d), e.value?.setData(d);
        }
      }
      K();
    }, xt = (o) => !o.column.renderEdit || !T.value ? null : o.column.renderEdit(T.value, (u, d, w) => d && (typeof d == "string" || Array.isArray(d) || d.__v_isVNode) ? A(u, null, d) : A(u, d, w)), gt = (o) => {
      if (!e.value) return {};
      const u = i.data.findIndex((kt) => kt.id === o);
      if (u === -1) return {};
      const d = e.value.getRowOffsets(), w = (d[u] ?? 0) - y.value + (i.options?.headerHeight || 48), k = (d[u + 1] ?? 0) - (d[u] ?? 0) - (i.options?.rowHeight || 40), z = e.value.getFixedLeftWidth();
      return {
        position: "absolute",
        top: `${w + (i.options?.rowHeight || 40)}px`,
        left: `${z}px`,
        width: `${g.value - z}px`,
        height: `${k}px`,
        pointerEvents: "auto",
        overflow: "hidden",
        backgroundColor: "#fdfdfd",
        borderBottom: "1px solid #ebeef5"
      };
    }, mt = () => ({
      marginLeft: `-${x.value}px`,
      minWidth: `${f.value - e.value?.getFixedLeftWidth()}px`,
      width: "100%"
    }), pt = (o) => {
      const u = i.data.find((d) => d.id === o);
      return !u || !i.options?.renderExpand ? null : A("div", { style: mt() }, [
        i.options.renderExpand(u, (d, w, k) => w && (typeof w == "string" || Array.isArray(w) || w.__v_isVNode) ? A(d, null, w) : A(d, w, k))
      ]);
    }, wt = (o) => {
      const u = o.target;
      x.value = u.scrollLeft, e.value?.scrollTo(x.value, y.value), C.value = null;
    }, yt = (o) => {
      const u = o.target;
      y.value = u.scrollTop, e.value?.scrollTo(x.value, y.value), C.value = null;
    }, Ct = (o) => {
      if (!r.value || !l.value) return;
      const u = o.deltaY, d = o.shiftKey ? o.deltaY : o.deltaX;
      r.value.scrollTop += u, l.value.scrollLeft += d;
    }, Rt = (o) => {
      const u = o[0];
      if (!u || !e.value) return;
      const { width: d, height: w } = u.contentRect;
      g.value = d, c.value = w, e.value.resize(d, w), O();
    }, O = () => {
      e.value && (f.value = e.value.getTotalWidth(), v.value = e.value.getTotalHeight(), p.value = e.value.getFixedLeftWidth());
    }, V = (o, u = 0) => {
      R.value = Math.max(R.value, u + 1), o.forEach((d) => {
        d.children && d.children.length > 0 ? V(d.children, u + 1) : m.value.push(d);
      });
    };
    let N = null;
    return Ht(() => {
      n.value && (e.value = new $t(n.value), e.value.setColumns(i.columns), e.value.setData(i.data), e.value.setOptions(i.options || {}), O(), m.value = [], R.value = 0, V(i.columns), N = new ResizeObserver(Rt), a.value && N.observe(a.value), n.value.addEventListener("mousemove", Q), n.value.addEventListener("mousedown", Z), n.value.addEventListener("dblclick", j));
    }), Lt(() => {
      N?.disconnect(), n.value?.removeEventListener("mousemove", Q), n.value?.removeEventListener("mousedown", Z), n.value?.removeEventListener("dblclick", j), e.value?.destroy(), e.value = null;
    }), J(() => i.columns, (o) => {
      e.value?.setColumns(o), m.value = [], R.value = 0, V(o), O();
    }, { deep: !0 }), J(() => i.data, (o) => {
      e.value?.setData(o), O();
    }, { deep: !0 }), J(() => i.options, (o) => {
      o && e.value?.setOptions(o);
    }, { deep: !0 }), (o, u) => (L(), W("div", {
      class: "canvas-table-container",
      ref_key: "containerRef",
      ref: a
    }, [
      m.value.length > 0 ? (L(), U(It, {
        key: 0,
        columns: i.columns,
        flattenedColumns: m.value,
        columnLevels: R.value,
        headerHeight: i.options?.headerHeight || 48,
        scrollX: x.value,
        fixedLeftWidth: p.value,
        hoverIndex: P.value,
        selectedRows: E.value,
        data: i.data,
        onHeaderHover: ct,
        onHeaderLeave: ht,
        onToggleAll: dt,
        onHeaderMenu: ut
      }, null, 8, ["columns", "flattenedColumns", "columnLevels", "headerHeight", "scrollX", "fixedLeftWidth", "hoverIndex", "selectedRows", "data"])) : X("", !0),
      H("div", {
        class: "canvas-wrapper",
        style: B(st.value),
        onWheel: Y(Ct, ["prevent"])
      }, [
        H("canvas", {
          ref_key: "canvasRef",
          ref: n
        }, null, 512),
        H("div", {
          class: "scrollbar horizontal",
          ref_key: "hScrollRef",
          ref: l,
          onScroll: wt
        }, [
          H("div", {
            style: B({ width: f.value + "px", height: "1px" })
          }, null, 4)
        ], 544),
        H("div", {
          class: "scrollbar vertical",
          ref_key: "vScrollRef",
          ref: r,
          onScroll: yt
        }, [
          H("div", {
            style: B({ height: v.value + "px", width: "1px" })
          }, null, 4)
        ], 544),
        H("div", {
          class: "table-overlays",
          style: B(it.value)
        }, [
          C.value && C.value.column.renderEdit ? (L(), W("div", {
            key: 0,
            class: "edit-btn",
            style: B(nt.value),
            onClick: u[0] || (u[0] = Y((d) => tt(C.value), ["stop"]))
          }, [...u[2] || (u[2] = [
            H("svg", {
              viewBox: "0 0 24 24",
              width: "14",
              height: "14"
            }, [
              H("path", {
                fill: "currentColor",
                d: "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
              })
            ], -1)
          ])], 4)) : X("", !0),
          M.value ? (L(), W("div", {
            key: 1,
            class: "header-menu-overlay",
            onClick: u[1] || (u[1] = Y((d) => M.value = null, ["self"]))
          }, [
            H("div", {
              class: "header-menu",
              style: B(ot.value)
            }, [
              (L(!0), W(D, null, F(at.value, (d) => (L(), W("div", {
                key: d.label,
                class: "menu-item",
                onClick: (w) => rt(d)
              }, [
                H("span", At, G(d.icon || "•"), 1),
                H("span", Dt, G(d.label), 1)
              ], 8, Ot))), 128))
            ], 4)
          ])) : X("", !0),
          (L(!0), W(D, null, F(I.value, (d) => (L(), W("div", {
            key: d,
            class: "expand-row-overlay",
            style: B(gt(d))
          }, [
            (L(), U(Et(pt(d))))
          ], 4))), 128)),
          (L(), U(Wt, { to: "body" }, [
            S.value ? (L(), W("div", {
              key: 0,
              class: "edit-dialog-popover",
              style: B(lt.value)
            }, [
              H("div", Ft, [
                Pt(zt(s), {
                  vnode: xt(S.value)
                }, null, 8, ["vnode"])
              ]),
              H("div", { class: "edit-dialog-footer" }, [
                H("button", {
                  class: "small",
                  onClick: K
                }, "Cancel"),
                H("button", {
                  class: "small primary",
                  onClick: vt
                }, "Save")
              ])
            ], 4)) : X("", !0),
            S.value ? (L(), W("div", {
              key: 1,
              class: "popover-click-mask",
              onClick: K
            })) : X("", !0)
          ]))
        ], 4)
      ], 36)
    ], 512));
  }
}), Nt = /* @__PURE__ */ et(Kt, [["__scopeId", "data-v-9024458b"]]);
export {
  $t as CanvasRenderer,
  Nt as CanvasTable,
  It as TableHeader
};
