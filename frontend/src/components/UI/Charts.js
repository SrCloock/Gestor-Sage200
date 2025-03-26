import React from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS } from 'chart.js/auto';

export const BarChart = ({ data }) => {
  const chartData = {
    labels: data.map(item => item.name),
    datasets: [{
      label: 'Ventas',
      data: data.map(item => item.value),
      backgroundColor: '#1890ff'
    }]
  };

  return <Bar data={chartData} />;
};

export const PieChart = ({ data }) => {
  const chartData = {
    labels: data.map(item => item.name),
    datasets: [{
      data: data.map(item => item.value),
      backgroundColor: [
        '#1890ff', '#36cfc9', '#9254de', '#ff7a45', '#ffc53d'
      ]
    }]
  };

  return <Pie data={chartData} />;
};