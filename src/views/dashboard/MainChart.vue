<script setup>
import { onMounted, ref } from 'vue'
import { CChart } from '@coreui/vue-chartjs'
import { getStyle } from '@coreui/utils'
import axios from 'axios'

const mainChartRef = ref(null)

const chartLabels = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const approvedCounts = ref(new Array(12).fill(0))
const rejectedCounts = ref(new Array(12).fill(0))
const submittedCounts = ref(new Array(12).fill(0))

const currentYear = new Date().getFullYear()

// data reactive chart, kosong dulu, nanti diupdate
const data = ref({
  labels: chartLabels,
  datasets: [
    {
      label: 'Approved',
      backgroundColor: `rgba(${getStyle('--cui-success-rgb')}, .1)`,
      borderColor: getStyle('--cui-success'),
      pointHoverBackgroundColor: getStyle('--cui-success'),
      borderWidth: 2,
      data: [],
      fill: true,
    },
    {
      label: 'Rejected',
      backgroundColor: 'transparent',
      borderColor: getStyle('--cui-danger'),
      pointHoverBackgroundColor: getStyle('--cui-danger'),
      borderWidth: 2,
      data: [],
    },
    {
      label: 'Submitted',
      backgroundColor: 'transparent',
      borderColor: getStyle('--cui-info'),
      pointHoverBackgroundColor: getStyle('--cui-info'),
      borderWidth: 2,
      data: [],
    },
  ],
})

function updateChartData() {
  data.value = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Approved',
        backgroundColor: `rgba(${getStyle('--cui-success-rgb')}, .1)`,
        borderColor: getStyle('--cui-success'),
        pointHoverBackgroundColor: getStyle('--cui-success'),
        borderWidth: 2,
        data: [...approvedCounts.value],
        fill: true,
      },
      {
        label: 'Rejected',
        backgroundColor: 'transparent',
        borderColor: getStyle('--cui-danger'),
        pointHoverBackgroundColor: getStyle('--cui-danger'),
        borderWidth: 2,
        data: [...rejectedCounts.value],
      },
      {
        label: 'Submitted',
        backgroundColor: 'transparent',
        borderColor: getStyle('--cui-info'),
        pointHoverBackgroundColor: getStyle('--cui-info'),
        borderWidth: 2,
        data: [...submittedCounts.value],
      },
    ],
  }

  if (mainChartRef.value) {
    mainChartRef.value.chart.update()
  }
}

async function fetchApiData() {
  try {
    const token = localStorage.getItem('token')
    if (!token) throw new Error('Token not found, please login.')

    const res = await axios.post(
      '/api/restv2/createApi/api/getDataApi',
      { token },
      {
        headers: {
          Authorization: 'Basic QWRtaW46bWFuYWdl',
          'Content-Type': 'application/json',
        },
      }
    )

    const dataApis = res.data.responseData?.results || []

    // Reset counts
    approvedCounts.value.fill(0)
    rejectedCounts.value.fill(0)
    submittedCounts.value.fill(0)

    dataApis.forEach(item => {
      if (item.createdate) {
        // Ganti semua slash "/" jadi spasi supaya Date bisa parse
        const normalizedDateStr = item.createdate.replace(/\//g, ' ')
        const date = new Date(normalizedDateStr)
        if (!isNaN(date) && date.getFullYear() === currentYear) {
          const month = date.getMonth()
          if (month >= 0 && month <= 11) {
            const approval = (item.approval || '').toUpperCase()
            if (approval === 'APPROVED') approvedCounts.value[month]++
            else if (approval === 'REJECTED') rejectedCounts.value[month]++
            else if (approval === 'SUBMITTED') submittedCounts.value[month]++
          }
        }
      }
    })

    updateChartData()
  } catch (error) {
    console.error('Error fetching API data:', error)
  }
}

const options = {
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      labels: { color: getStyle('--cui-body-color') },
    },
  },
  scales: {
    x: {
      grid: {
        color: getStyle('--cui-border-color-translucent'),
        drawOnChartArea: false,
      },
      ticks: {
        color: getStyle('--cui-body-color'),
      },
    },
    y: {
      beginAtZero: true,
      border: {
        color: getStyle('--cui-border-color-translucent'),
      },
      grid: {
        color: getStyle('--cui-border-color-translucent'),
      },
      ticks: {
        color: getStyle('--cui-body-color'),
        maxTicksLimit: 5,
      },
    },
  },
  elements: {
    line: {
      tension: 0.4,
    },
    point: {
      radius: 4,
      hitRadius: 10,
      hoverRadius: 6,
      hoverBorderWidth: 3,
    },
  },
}

onMounted(() => {
  fetchApiData()

  document.documentElement.addEventListener('ColorSchemeChange', () => {
    if (mainChartRef.value) {
      mainChartRef.value.chart.options.scales.x.grid.color = getStyle(
        '--cui-border-color-translucent',
      )
      mainChartRef.value.chart.options.scales.x.ticks.color = getStyle('--cui-body-color')
      mainChartRef.value.chart.options.scales.y.grid.color = getStyle(
        '--cui-border-color-translucent',
      )
      mainChartRef.value.chart.options.scales.y.ticks.color = getStyle('--cui-body-color')
      mainChartRef.value.chart.update()
    }
  })
})
</script>

<template>
  <CChart type="line" :data="data" :options="options" ref="mainChartRef" />
</template>
