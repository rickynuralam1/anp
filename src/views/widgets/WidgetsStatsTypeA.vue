<script setup>
import { ref, computed, onMounted } from 'vue'
import { CChart } from '@coreui/vue-chartjs'
import { getStyle } from '@coreui/utils'
import axios from 'axios'

// Labels bulan untuk chart
const chartLabels = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

// Total keseluruhan per kategori
const totalApproved = ref(0)
const totalRejected = ref(0)
const totalSubmitted = ref(0)
const totalAll = ref(0)

// Data per bulan masing-masing kategori (array 12 bulan)
const approvedCounts = ref(new Array(12).fill(0))
const rejectedCounts = ref(new Array(12).fill(0))
const submittedCounts = ref(new Array(12).fill(0))
const totalCounts = ref(new Array(12).fill(0))

// Chart data untuk bind ke CChart
const chartDataApproved = ref({})
const chartDataRejected = ref({})
const chartDataSubmitted = ref({})
const chartDataTotal = ref({})

// Fungsi hitung % perubahan bulan ini dibanding sebelumnya
function calculateChangePercent(arr) {
  const currentMonthIndex = new Date().getMonth()
  const prevMonthIndex = currentMonthIndex === 0 ? 11 : currentMonthIndex - 1
  const currentValue = arr[currentMonthIndex] || 0
  const prevValue = arr[prevMonthIndex] || 0
  if (prevValue === 0) return currentValue === 0 ? 0 : 100
  return Math.round(((currentValue - prevValue) / prevValue) * 100)
}

// Fungsi arah panah dari persen
function getArrowDirection(percent) {
  if (percent > 0) return 'up'
  if (percent < 0) return 'down'
  return 'neutral'
}

// Update chart data
function updateChartData() {
  function createChartData(dataArray, borderColor, pointColor) {
    return {
      labels: chartLabels,
      datasets: [
        {
          label: 'Count',
          backgroundColor: 'transparent',
          borderColor,
          pointBackgroundColor: pointColor,
          data: dataArray,
          borderWidth: 2,
          tension: 0.4,
        },
      ],
    }
  }
  chartDataApproved.value = createChartData(
    approvedCounts.value,
    'rgba(40, 167, 69, 0.8)',
    'rgba(40, 167, 69, 1)'
  )
  chartDataRejected.value = createChartData(
    rejectedCounts.value,
    'rgba(220, 53, 69, 0.8)',
    'rgba(220, 53, 69, 1)'
  )
  chartDataSubmitted.value = createChartData(
    submittedCounts.value,
    'rgba(0, 123, 255, 0.8)',
    'rgba(0, 123, 255, 1)'
  )
  chartDataTotal.value = createChartData(
    totalCounts.value,
    'rgba(108, 117, 125, 0.8)',
    'rgba(108, 117, 125, 1)'
  )
}

// Ambil data dari API dan hitung statistik
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

    // Reset array hitung per bulan
    approvedCounts.value = new Array(12).fill(0)
    rejectedCounts.value = new Array(12).fill(0)
    submittedCounts.value = new Array(12).fill(0)
    totalCounts.value = new Array(12).fill(0)

    const currentYear = new Date().getFullYear()

    dataApis.forEach(item => {
      if (item.createdate) {
        const normalizedDateStr = item.createdate.replace(/\//g, ' ')
        const date = new Date(normalizedDateStr)
        if (!isNaN(date) && date.getFullYear() === currentYear) {
          const month = date.getMonth()
          totalCounts.value[month]++
          const approval = (item.approval || '').toUpperCase()
          if (approval === 'APPROVED') approvedCounts.value[month]++
          else if (approval === 'REJECTED') rejectedCounts.value[month]++
          else if (approval === 'SUBMITTED') submittedCounts.value[month]++
        }
      }
    })

    // Total keseluruhan
    totalApproved.value = approvedCounts.value.reduce((a, b) => a + b, 0)
    totalRejected.value = rejectedCounts.value.reduce((a, b) => a + b, 0)
    totalSubmitted.value = submittedCounts.value.reduce((a, b) => a + b, 0)
    totalAll.value = totalCounts.value.reduce((a, b) => a + b, 0)

    updateChartData()
  } catch (error) {
    console.error('Error fetching API data:', error)
  }
}

onMounted(() => {
  fetchApiData()
})

// Opsi chart umum
const chartOptions = {
  plugins: { legend: { display: false } },
  maintainAspectRatio: false,
  scales: {
    x: { border: { display: false }, grid: { display: false }, ticks: { display: false } },
    y: { min: 0, display: false, grid: { display: false }, ticks: { display: false } },
  },
  elements: { line: { borderWidth: 2, tension: 0.4 }, point: { radius: 4, hitRadius: 10, hoverRadius: 4 } },
}
</script>

<template>
  <CRow :xs="{ gutter: 4 }">
    <CCol v-for="(chart, i) in [
      {
        title: 'Approved',
        total: totalApproved,
        counts: approvedCounts,
        chartData: chartDataApproved,
        color: 'primary',
        borderColor: 'rgba(40, 167, 69, 0.8)',
        pointColor: 'rgba(40, 167, 69, 1)',
      },
      {
        title: 'Rejected',
        total: totalRejected,
        counts: rejectedCounts,
        chartData: chartDataRejected,
        color: 'warning',
        borderColor: 'rgba(220, 53, 69, 0.8)',
        pointColor: 'rgba(220, 53, 69, 1)',
      },
      {
        title: 'Submitted',
        total: totalSubmitted,
        counts: submittedCounts,
        chartData: chartDataSubmitted,
        color: 'success',
        borderColor: 'rgba(0, 123, 255, 0.8)',
        pointColor: 'rgba(0, 123, 255, 1)',
      },
      {
        title: 'Requests',
        total: totalAll,
        counts: totalCounts,
        chartData: chartDataTotal,
        color: 'info',
        borderColor: 'rgba(108, 117, 125, 0.8)',
        pointColor: 'rgba(108, 117, 125, 1)',
      },
    ]"
    :key="i" :sm="6" :xl="3">
      <CWidgetStatsA :color="chart.color">
        <template #value>
          {{ chart.total }} Apis
          <span class="fs-6 fw-normal ms-2 d-inline-flex align-items-center">
            <CIcon
              v-if="getArrowDirection(calculateChangePercent(chart.counts)) === 'up'"
              icon="cil-arrow-top"
              class="text-success me-1"
            />
            <CIcon
              v-else-if="getArrowDirection(calculateChangePercent(chart.counts)) === 'down'"
              icon="cil-arrow-bottom"
              class="text-danger me-1"
            />
            <span
              :class="{
                'text-success': getArrowDirection(calculateChangePercent(chart.counts)) === 'up',
                'text-danger': getArrowDirection(calculateChangePercent(chart.counts)) === 'down',
                'text-muted': getArrowDirection(calculateChangePercent(chart.counts)) === 'neutral',
              }"
            >
              {{ Math.abs(calculateChangePercent(chart.counts)) }}%
            </span>
          </span>
        </template>
        <template #title>{{ chart.title }}</template>
        <template #chart>
          <CChart
            type="line"
            class="mt-3 mx-3"
            style="height: 70px"
            :data="chart.chartData"
            :options="chartOptions"
          />
        </template>
      </CWidgetStatsA>
    </CCol>
  </CRow>
</template>
