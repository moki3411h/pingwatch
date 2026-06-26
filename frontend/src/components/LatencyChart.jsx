import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  PointElement, LineElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale,
  PointElement, LineElement,
  Title, Tooltip, Legend, Filler
);

export default function LatencyChart({ pings }) {
  const labels = pings
    .slice()
    .reverse()
    .map((p) => new Date(p.checked_at).toLocaleTimeString());

  const data = {
    labels,
    datasets: [{
      label: 'Latency (ms)',
      data: pings.slice().reverse().map((p) => p.latency_ms),
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99,102,241,0.1)',
      tension: 0.3,
      fill: true,
      pointRadius: 3,
    }],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { labels: { color: '#94a3b8' } },
    },
    scales: {
      x: { ticks: { color: '#64748b', maxTicksLimit: 8 }, grid: { color: '#1e293b' } },
      y: { ticks: { color: '#64748b' }, grid: { color: '#334155' } },
    },
  };

  return <Line data={data} options={options} />;
}
