// FinanceFlow — Chart.js Interop for Blazor MAUI
// Управляет жизненным циклом Chart.js экземпляров

window.chartInstances = {};

window.chartInterop = {

    // ── Render Bar/Line Chart ────────────────────────────
    renderBarChart: function (canvasId, labels, incomeData, expenseData) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        if (window.chartInstances[canvasId]) {
            window.chartInstances[canvasId].destroy();
        }

        window.chartInstances[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Доходы',
                        data: incomeData,
                        backgroundColor: 'rgba(34,211,160,0.7)',
                        borderColor: '#22d3a0',
                        borderWidth: 1.5,
                        borderRadius: 6,
                        borderSkipped: false,
                    },
                    {
                        label: 'Расходы',
                        data: expenseData,
                        backgroundColor: 'rgba(247,95,108,0.7)',
                        borderColor: '#f75f6c',
                        borderWidth: 1.5,
                        borderRadius: 6,
                        borderSkipped: false,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: {
                        labels: {
                            color: '#8892b0',
                            font: { family: 'Inter', size: 11 },
                            boxWidth: 10,
                            padding: 12
                        }
                    },
                    tooltip: {
                        backgroundColor: '#141720',
                        titleColor: '#f0f2ff',
                        bodyColor: '#8892b0',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 1,
                        padding: 10,
                        callbacks: {
                            label: ctx => ` ₽${ctx.parsed.y.toLocaleString('ru-RU')}`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        ticks: { color: '#4a5272', font: { family: 'Inter', size: 10 } }
                    },
                    y: {
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        ticks: {
                            color: '#4a5272',
                            font: { family: 'Inter', size: 10 },
                            callback: v => '₽' + v.toLocaleString('ru-RU')
                        }
                    }
                }
            }
        });
    },

    // ── Render Doughnut Chart ────────────────────────────
    renderDoughnutChart: function (canvasId, labels, data, colors) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        if (window.chartInstances[canvasId]) {
            window.chartInstances[canvasId].destroy();
        }

        window.chartInstances[canvasId] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors || [
                        '#4f8ef7','#22d3a0','#f75f6c','#f7a845',
                        '#9b5de5','#38bdf8','#fb923c','#a3e635'
                    ],
                    borderColor: '#141720',
                    borderWidth: 2,
                    hoverBorderColor: '#1a1e2e',
                    hoverBorderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '68%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#8892b0',
                            font: { family: 'Inter', size: 11 },
                            boxWidth: 10,
                            padding: 10
                        }
                    },
                    tooltip: {
                        backgroundColor: '#141720',
                        titleColor: '#f0f2ff',
                        bodyColor: '#8892b0',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 1,
                        padding: 10,
                        callbacks: {
                            label: ctx => ` ₽${ctx.parsed.toLocaleString('ru-RU')}`
                        }
                    }
                }
            }
        });
    },

    // ── Render Line Chart (balance timeline) ────────────
    renderLineChart: function (canvasId, labels, data) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        if (window.chartInstances[canvasId]) {
            window.chartInstances[canvasId].destroy();
        }

        window.chartInstances[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Баланс',
                    data: data,
                    borderColor: '#4f8ef7',
                    backgroundColor: 'rgba(79,142,247,0.08)',
                    borderWidth: 2,
                    pointRadius: 3,
                    pointBackgroundColor: '#4f8ef7',
                    pointBorderColor: '#141720',
                    pointBorderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#141720',
                        titleColor: '#f0f2ff',
                        bodyColor: '#8892b0',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 1,
                        padding: 10,
                        callbacks: {
                            label: ctx => ` ₽${ctx.parsed.y.toLocaleString('ru-RU')}`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        ticks: { color: '#4a5272', font: { family: 'Inter', size: 10 } }
                    },
                    y: {
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        ticks: {
                            color: '#4a5272',
                            font: { family: 'Inter', size: 10 },
                            callback: v => '₽' + v.toLocaleString('ru-RU')
                        }
                    }
                }
            }
        });
    },

    // ── Destroy chart ─────────────────────────────────
    destroyChart: function (canvasId) {
        if (window.chartInstances[canvasId]) {
            window.chartInstances[canvasId].destroy();
            delete window.chartInstances[canvasId];
        }
    }
};
