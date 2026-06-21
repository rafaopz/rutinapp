// Gráfica de línea minimalista en SVG (sin dependencias externas).

export interface ChartPoint {
  x: string; // etiqueta (fecha)
  y: number; // valor
}

interface LineChartProps {
  data: ChartPoint[];
  unit?: string;
  height?: number;
}

export function LineChart({ data, unit = "", height = 180 }: LineChartProps) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-on-surface-variant">
        Sin datos aún.
      </p>
    );
  }

  const width = 320;
  const pad = { top: 16, right: 12, bottom: 24, left: 36 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const ys = data.map((d) => d.y);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const range = maxY - minY || 1;
  // Un poco de margen arriba/abajo para que la línea no toque los bordes.
  const lo = minY - range * 0.1;
  const hi = maxY + range * 0.1;
  const span = hi - lo || 1;

  const xFor = (i: number) =>
    pad.left + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const yFor = (v: number) => pad.top + innerH - ((v - lo) / span) * innerH;

  const linePath = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(d.y)}`)
    .join(" ");

  // Hasta 4 etiquetas en el eje X para no saturar en móvil.
  const labelStep = Math.ceil(data.length / 4);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      role="img"
      aria-label="Gráfica de progresión"
    >
      {/* Ejes de referencia (min, medio, max) */}
      {[hi, (hi + lo) / 2, lo].map((v, i) => {
        const y = yFor(v);
        return (
          <g key={i}>
            <line
              x1={pad.left}
              y1={y}
              x2={width - pad.right}
              y2={y}
              stroke="#222a3d"
              strokeWidth={1}
            />
            <text x={4} y={y + 4} fill="#908fa0" fontSize={9}>
              {v.toFixed(0)}
            </text>
          </g>
        );
      })}

      {/* Área bajo la curva */}
      <path
        d={`${linePath} L ${xFor(data.length - 1)} ${pad.top + innerH} L ${xFor(0)} ${pad.top + innerH} Z`}
        fill="#14b8a6"
        opacity={0.14}
      />
      {/* Línea */}
      <path d={linePath} fill="none" stroke="#14b8a6" strokeWidth={2} />

      {/* Puntos */}
      {data.map((d, i) => (
        <circle key={i} cx={xFor(i)} cy={yFor(d.y)} r={3} fill="#14b8a6" />
      ))}

      {/* Etiquetas eje X */}
      {data.map((d, i) =>
        i % labelStep === 0 || i === data.length - 1 ? (
          <text
            key={i}
            x={xFor(i)}
            y={height - 6}
            fill="#64748b"
            fontSize={9}
            textAnchor="middle"
          >
            {d.x.slice(5)}
          </text>
        ) : null,
      )}

      {unit && (
        <text x={width - pad.right} y={11} fill="#475569" fontSize={9} textAnchor="end">
          {unit}
        </text>
      )}
    </svg>
  );
}
