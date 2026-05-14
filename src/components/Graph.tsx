import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface GraphData {
  type: 'line' | 'bar' | 'pie';
  title: string;
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor?: string | string[];
      borderColor?: string | string[];
      borderWidth?: number;
      tension?: number;
    }>;
  };
}

interface GraphProps {
  graphData: GraphData;
  darkMode?: boolean;
}

const Graph: React.FC<GraphProps> = ({ graphData, darkMode = false }) => {
  const textColor = darkMode ? '#E5E7EB' : '#374151';
  const titleColor = darkMode ? '#F9FAFB' : '#111827';
  const gridColor = darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
  const tickColor = darkMode ? '#9CA3AF' : '#6B7280';
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: textColor,
          font: {
            size: 12,
          },
        },
      },
      title: {
        display: true,
        text: graphData.title,
        color: titleColor,
        font: {
          size: 16,
          weight: 'bold' as const,
        },
        padding: {
          top: 10,
          bottom: 20,
        },
      },
      tooltip: {
        backgroundColor: darkMode ? 'rgba(0, 0, 0, 0.9)' : 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
      },
    },
    scales: graphData.type !== 'pie' ? {
      y: {
        beginAtZero: true,
        ticks: {
          color: tickColor,
        },
        grid: {
          color: gridColor,
        },
      },
      x: {
        ticks: {
          color: tickColor,
        },
        grid: {
          color: gridColor,
        },
      },
    } : undefined,
  };

  const renderChart = () => {
    switch (graphData.type) {
      case 'line':
        return <Line data={graphData.data} options={chartOptions} />;
      case 'bar':
        return <Bar data={graphData.data} options={chartOptions} />;
      case 'pie':
        return <Pie data={graphData.data} options={chartOptions} />;
      default:
        return null;
    }
  };

  return (
    <div className={`mt-4 rounded-lg border p-4 shadow-sm ${
      darkMode 
        ? 'bg-slate-800/50 border-white/10' 
        : 'bg-white border-gray-200'
    }`}>
      <div style={{ height: '300px', position: 'relative' }}>
        {renderChart()}
      </div>
    </div>
  );
};

export default Graph;

