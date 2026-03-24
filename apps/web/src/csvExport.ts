interface Column<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

function escapeCSV(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return '"' + val.replace(/"/g, '""') + '"';
  }
  return val;
}

export function toCSV<T>(rows: T[], columns: Column<T>[]): string {
  const header = columns.map((c) => escapeCSV(c.header)).join(",");
  const body = rows.map((row) =>
    columns
      .map((c) => {
        const v = c.value(row);
        if (v == null) return "";
        if (typeof v === "number") return isFinite(v) ? String(v) : "";
        return escapeCSV(String(v));
      })
      .join(","),
  );
  return [header, ...body].join("\n");
}

export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
