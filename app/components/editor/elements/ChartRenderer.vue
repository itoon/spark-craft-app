<template>
  <div class="w-full h-full relative bg-white flex flex-col">
    <p
      v-if="title"
      class="text-center text-xs font-semibold text-neutral-700 pt-1 px-2 shrink-0 truncate"
    >
      {{ title }}
    </p>
    <div class="flex-1 min-h-0 relative">
      <canvas ref="canvasRef" class="w-full h-full" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from "vue";
import {
  Chart,
  BarController,
  LineController,
  PieController,
  DoughnutController,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Title,
} from "chart.js";

Chart.register(
  BarController,
  LineController,
  PieController,
  DoughnutController,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Title,
);

const props = withDefaults(
  defineProps<{
    chartType?: "bar" | "line" | "pie" | "doughnut";
    labels?: string[];
    datasets?: { label: string; data: number[]; color: string }[];
    title?: string;
  }>(),
  {
    chartType: "bar",
    labels: () => ["A", "B", "C", "D", "E"],
    datasets: () => [{ label: "Series 1", data: [40, 65, 28, 80, 52], color: "#3880ff" }],
    title: "",
  },
);

const canvasRef = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;

function buildConfig() {
  const isPolar = props.chartType === "pie" || props.chartType === "doughnut";

  const buildColors = (ds: { color: string; data: number[] }) => {
    if (isPolar) {
      // Each slice gets a tint of the dataset colour
      return ds.data.map((_, i) => {
        const hex = ds.color.replace("#", "");
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        const ratio = 0.4 + (i / Math.max(ds.data.length - 1, 1)) * 0.6;
        return `rgba(${r},${g},${b},${ratio.toFixed(2)})`;
      });
    }
    return ds.color;
  };

  return {
    type: props.chartType,
    data: {
      labels: props.labels,
      datasets: props.datasets.map((ds) => ({
        label: ds.label,
        data: ds.data,
        backgroundColor: buildColors(ds),
        borderColor: isPolar ? "transparent" : ds.color,
        borderWidth: isPolar ? 0 : 2,
        borderRadius: props.chartType === "bar" ? 4 : 0,
        fill: props.chartType === "line" ? false : undefined,
        tension: props.chartType === "line" ? 0.4 : undefined,
        pointBackgroundColor: ds.color,
        pointRadius: props.chartType === "line" ? 4 : undefined,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 300 },
      plugins: {
        legend: {
          display: props.datasets.length > 1 || isPolar,
          position: "bottom" as const,
          labels: { font: { size: 10 }, boxWidth: 12, padding: 8 },
        },
        tooltip: { enabled: true },
      },
      scales: isPolar
        ? {}
        : {
            x: {
              grid: { display: false },
              ticks: { font: { size: 10 } },
            },
            y: {
              beginAtZero: true,
              grid: { color: "rgba(0,0,0,0.06)" },
              ticks: { font: { size: 10 } },
            },
          },
    },
  } as any;
}

function createChart() {
  if (!canvasRef.value) return;
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
  chartInstance = new Chart(canvasRef.value, buildConfig());
}

function updateChart() {
  if (!chartInstance) return createChart();
  // If chart type changed, must recreate
  if ((chartInstance.config as any).type !== props.chartType) return createChart();

  const cfg = buildConfig();
  chartInstance.data = (cfg as any).data;
  Object.assign(chartInstance.options!, (cfg as any).options);
  chartInstance.update("active");
}

onMounted(() => nextTick(createChart));

watch(
  () => [props.chartType, props.labels, props.datasets, props.title],
  () => nextTick(updateChart),
  { deep: true },
);

onBeforeUnmount(() => {
  chartInstance?.destroy();
  chartInstance = null;
});
</script>
