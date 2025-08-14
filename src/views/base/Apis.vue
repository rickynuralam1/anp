<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import {
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CButton,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CSpinner,
} from '@coreui/vue'

const apis = ref([])
const loading = ref(false)
const error = ref(null)
const showModal = ref(false)
const showCreateApiModal = ref(false)
const showUpdateApiModal = ref(false) // modal update
const selectedApi = ref(null)
const isAdmin = computed(() => localStorage.getItem('role') === 'admin')
const displayOption = ref('10')
const searchQuery = ref('')

const currentPage = ref(1)
const itemsPerPage = computed(() => {
  if (displayOption.value === '5') return 5
  if (displayOption.value === '10') return 10
  if (displayOption.value === '20') return 20
  if (displayOption.value === '50') return 50
  return apis.value.length
})

const filteredApis = computed(() => {
  return apis.value.filter(api =>
    Object.values(api).some(val =>
      String(val).toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  )
})

const totalPages = computed(() => {
  if (itemsPerPage.value === 0) return 1
  return Math.ceil(filteredApis.value.length / itemsPerPage.value)
})

const paginatedApis = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredApis.value.slice(start, end)
})

const goToPage = (page) => {
  if (page < 1) page = 1
  if (page > totalPages.value) page = totalPages.value
  currentPage.value = page
}

const openModal = (item) => {
  selectedApi.value = item
  showModal.value = true
}

// ===== CREATE API FORM =====
const apiForm = ref({
  server: '',
  apiName: '',
  apiVersion: '',
  apiType: '',
  authType: '',
  typeTemplate: '',
  headerRequest: [['', '']],
  apiResources: [['', '']],
  baseUrl: '',
  pathUrl: ''
})

// ===== UPDATE API FORM =====
const updateForm = ref({
  id: '',
  server: '',
  apiName: '',
  apiVersion: '',
  apiType: '',
  authType: '',
  typeTemplate: '',
  headerRequest: [['', '']],
  apiResources: [['', '']],
  baseUrl: '',
  pathUrl: ''
})

// List server untuk opsi
const servers = ref([])

// List template policies dari API getTemplatePolicy
const templatePolicies = ref([])

// Hitung unique typetemplate dari templatePolicies
const uniqueTemplates = computed(() => {
  const setTemplates = new Set()
  templatePolicies.value.forEach(item => {
    if (item.typetemplate) {
      setTemplates.add(item.typetemplate)
    }
  })
  return [...setTemplates]
})

// Flag untuk memastikan redirect/login alert cuma muncul sekali
let hasRedirected = false

// Helper redirect ke login + clear token, cuma sekali alert dan redirect
function redirectToLogin(msg = '') {
  if (hasRedirected) return
  hasRedirected = true
  alert(msg || 'Session expired or unauthorized. Please login again.')
  localStorage.removeItem('token')
  window.location.href = '/login'
}

const fetchServers = async () => {
  try {
    const token = localStorage.getItem('token')
    if (!token) {
      console.warn('Token not found in localStorage')
      redirectToLogin()
      return
    }
    const res = await axios.post(
      '/api/restv2/createApi/server/getServer',
      JSON.stringify({ token }),
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Basic QWRtaW46bWFuYWdl'
        }
      }
    )
    if (res.data.responseDesc === 'success') {
      servers.value = res.data.responseData.results || []
    } else {
      redirectToLogin(res.data.responseMessage || 'Unauthorized access')
    }
  } catch (err) {
    const msg = err.response?.data?.message || err.message
    if (err.response?.status === 401) {
      redirectToLogin(msg)
    } else {
      console.error('Gagal ambil server:', msg)
    }
  }
}

const createApi = async () => {
  try {
    const token = localStorage.getItem('token')
    if (!token) {
      redirectToLogin()
      return
    }

    const filteredHeader = apiForm.value.headerRequest.filter(h => h[0] && h[1])
    const filteredResources = apiForm.value.apiResources.filter(r => r[0] && r[1])

    const payload = {
      token,
      server: apiForm.value.server,
      apiName: apiForm.value.apiName,
      apiVersion: apiForm.value.apiVersion,
      apiType: apiForm.value.apiType,
      authType: apiForm.value.authType,
      typeTemplate: apiForm.value.typeTemplate,
      headerRequest: filteredHeader,
      apiResources: filteredResources,
      baseUrl: apiForm.value.baseUrl,
      pathUrl: apiForm.value.pathUrl
    }

    const res = await axios.post(
      '/api/restv2/createApi/api/requestsApi',
      JSON.stringify(payload),
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Basic QWRtaW46bWFuYWdl'
        }
      }
    )

    if (res.data.responseDesc !== 'success') {
      alert('Failed to create API: ' + (res.data.responseMessage || 'Unknown error'))
      return
    }

    alert('API Created Successfully!')
    showCreateApiModal.value = false
    await fetchData()
    await fetchTemplatePolicies()
  } catch (err) {
    const msg = err.response?.data?.message || err.message
    if (err.response?.status === 401) {
      redirectToLogin(msg)
    } else {
      console.error('Error creating API:', msg)
      alert('Failed to create API: ' + msg)
    }
  }
}

// Fungsi buka modal update dan isi form update dengan data api yang dipilih
const openUpdateModal = (api) => {
  updateForm.value = {
    id: api.id || '',
    server: api.server || '',
    apiName: api.apiname || '',
    apiVersion: api.apiversion || '',
    apiType: api.apitype || '',
    authType: api.authtype || '',
    typeTemplate: api.typetemplate || api.typeTemplate || '',
    // konversi headerRequest.results ke array 2D
    headerRequest: Array.isArray(api.headerRequest?.results)
      ? api.headerRequest.results.map(h => [h.headerkey, h.headervalue])
      : [['', '']],
    // konversi resources.results ke array 2D
    apiResources: Array.isArray(api.resources?.results)
      ? api.resources.results.map(r => [r.name, r.methods])
      : [['', '']],
    baseUrl: api.baseurl || '',
    pathUrl: api.pathurl || ''
  }
  showUpdateApiModal.value = true
}

// Fungsi untuk update API ke server
const updateApi = async () => {
  try {
    const token = localStorage.getItem('token')
    if (!token) {
      redirectToLogin()
      return
    }

    // filter dan convert kembali ke format objek untuk backend
    const filteredHeader = updateForm.value.headerRequest
      .filter(h => h[0] && h[1])
      .map(([headerkey, headervalue]) => ({ headerkey, headervalue }))

    const filteredResources = updateForm.value.apiResources
      .filter(r => r[0] && r[1])
      .map(([name, methods]) => ({ name, methods }))

    const payload = {
      token,
      id: updateForm.value.id,
      server: updateForm.value.server,
      apiName: updateForm.value.apiName,
      apiVersion: updateForm.value.apiVersion,
      apiType: updateForm.value.apiType,
      authType: updateForm.value.authType,
      typeTemplate: updateForm.value.typeTemplate,
      headerRequest: filteredHeader,
      apiResources: filteredResources,
      baseUrl: updateForm.value.baseUrl,
      pathUrl: updateForm.value.pathUrl
    }

    const res = await axios.post(
      '/api/restv2/createApi/api/updateApi',
      JSON.stringify(payload),
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Basic QWRtaW46bWFuYWdl'
        }
      }
    )

    if (res.data.responseDesc !== 'success') {
      alert('Failed to update API: ' + (res.data.responseMessage || 'Unknown error'))
      return
    }

    alert('API Updated Successfully!')
    showUpdateApiModal.value = false
    await fetchData()
    await fetchTemplatePolicies()
  } catch (err) {
    const msg = err.response?.data?.message || err.message
    if (err.response?.status === 401) {
      redirectToLogin(msg)
    } else {
      console.error('Error updating API:', msg)
      alert('Failed to update API: ' + msg)
    }
  }
}

// Approval modal states
const showApprovalModal = ref(false)
const approvalApiId = ref(null)
const approvalStatus = ref('APPROVED')
const approvalMessage = ref('')

// Fungsi buka modal approval
function openApprovalModal(apiId) {
  approvalApiId.value = apiId
  approvalStatus.value = 'APPROVED'
  approvalMessage.value = ''
  showApprovalModal.value = true
}

// Fungsi submit approval/rejection ke backend
async function submitApproval() {
  if (approvalStatus.value === 'REJECTED' && !approvalMessage.value.trim()) {
    alert('Mohon isi pesan alasan reject')
    return
  }

  try {
    const token = localStorage.getItem('token')
    if (!token) {
      alert('Token tidak ditemukan, silakan login ulang')
      window.location.href = '/login'
      return
    }

    const payload = {
      token,
      idApi: approvalApiId.value,
      approvalStatus: approvalStatus.value,
      approvalMessages: approvalStatus.value === 'REJECTED' ? approvalMessage.value.trim() : 'APPROVED'
    }

    const res = await axios.post(
      '/api/restv2/createApi/api/approvalRequestApi',
      JSON.stringify(payload),
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Basic QWRtaW46bWFuYWdl'
        }
      }
    )

    if (res.data.responseDesc === 'success') {
      alert('Approval berhasil')
      showApprovalModal.value = false
      await fetchData()
    } else {
      alert('Approval: ' + (res.data.responseMessage || 'Unknown error'))
    }
  } catch (error) {
    alert('Error saat approval: ' + (error.message || error))
  }
}

// ===== Delete Modal dan Fungsi =====

const showDeleteModal = ref(false)
const deleteApiId = ref(null)

const openDeleteModal = (id) => {
  deleteApiId.value = id
  showDeleteModal.value = true
}

const deleteApi = async () => {
  try {
    const token = localStorage.getItem('token')
    if (!token) {
      redirectToLogin()
      return
    }

    const payload = {
      token,
      id: deleteApiId.value,
    }

    const res = await axios.post(
      '/api/restv2/createApi/api/deleteApi',
      JSON.stringify(payload),
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Basic QWRtaW46bWFuYWdl'
        }
      }
    )

    if (res.data.responseDesc !== 'success') {
      alert('Failed to delete API: ' + (res.data.responseMessage || 'Unknown error'))
      return
    }

    alert('API deleted successfully!')
    showDeleteModal.value = false
    deleteApiId.value = null
    await fetchData()
  } catch (err) {
    const msg = err.response?.data?.message || err.message
    if (err.response?.status === 401) {
      redirectToLogin(msg)
    } else {
      console.error('Error deleting API:', msg)
      alert('Failed to delete API: ' + msg)
    }
  }
}

const fetchData = async () => {
  loading.value = true
  error.value = null
  try {
    const token = localStorage.getItem('token')
    if (!token) {
      redirectToLogin()
      return
    }
    const response = await axios.post(
      '/api/restv2/createApi/api/getDataApi',
      JSON.stringify({ token }),
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Basic QWRtaW46bWFuYWdl',
        },
      }
    )
    if (response.data.responseDesc === 'success') {
      apis.value = response.data.responseData.results || []
    } else {
      redirectToLogin(response.data.responseMessage || 'Unauthorized access')
    }
  } catch (err) {
    const msg = err.response?.data?.message || err.message
    if (err.response?.status === 401) {
      redirectToLogin(msg)
    } else {
      error.value = 'Gagal memuat data: ' + msg
    }
  } finally {
    loading.value = false
  }
}

// Fetch template policy data terbaru dari API
const fetchTemplatePolicies = async () => {
  try {
    const token = localStorage.getItem('token')
    if (!token) {
      redirectToLogin()
      return
    }
    const res = await axios.post(
      '/api/restv2/createApi/templateApi/getTemplatePolicy',
      JSON.stringify({ token }),
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Basic QWRtaW46bWFuYWdl'
        }
      }
    )
    if (res.data.responseDesc === 'success') {
      templatePolicies.value = res.data.responseData.results || []
    } else {
      redirectToLogin(res.data.responseMessage || 'Unauthorized access')
    }
  } catch (err) {
    const msg = err.response?.data?.message || err.message
    if (err.response?.status === 401) {
      redirectToLogin(msg)
    } else {
      console.error('Gagal ambil template policies:', msg)
    }
  }
}

onMounted(() => {
  fetchData()
  fetchServers()
  fetchTemplatePolicies()
})
</script>


<template>
  <!-- Search -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
      <!-- Input Search (kiri) -->
      <div style="width: 100%; max-width: 33%;">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari..."
          style="
              width: 100%;
              border: 1px solid #d1d5db;
              border-radius: 4px;
              padding: 0.25rem 0.5rem;
              outline: none;
              transition: all 0.2s ease;
            "
            @focus="event.target.style.boxShadow = '0 0 0 2px #9ca3af'"
            @blur="event.target.style.boxShadow = 'none'"
        />
      </div>

      <!-- Tombol Add API (kanan) -->
      <div style="margin-left: 1000px; width: 800px;">
        <CButton color="primary" size="sm" title="Add API" @click="showCreateApiModal = true">
          Add API
        </CButton>
      </div>
    </div>


  <!-- Spinner loading -->
    <div v-if="loading" style="display: flex; justify-content: center; margin-top: 1rem; margin-bottom: 1rem;">
      <CSpinner color="primary" size="lg" />
    </div>

  <!-- Error message -->
    <div v-if="error" style="margin-bottom: 1rem; text-align: center; color: #dc2626; font-weight: 600;">
      {{ error }}
    </div>

  <!-- Tabel Data -->
      <CTable
  striped
  bordered
  hover
  responsive
  v-if="!loading && paginatedApis.length"
  style="width: 100%; color: black;"
>
  <CTableHead style="background-color: #f9fafb;">
    <CTableRow>
      <CTableHeaderCell
        style="width: 150px; padding: 0.5rem 1rem; font-weight: 600;"
      >Server</CTableHeaderCell>
      <CTableHeaderCell
        style="width: 200px; padding: 0.5rem 1rem; font-weight: 600;"
      >API Name</CTableHeaderCell>
      <CTableHeaderCell
        style="width: 100px; padding: 0.5rem 1rem; font-weight: 600;"
      >Versi</CTableHeaderCell>
      <CTableHeaderCell
        style="width: 140px; padding: 0.5rem 1rem; font-weight: 600;"
      >Tanggal Dibuat</CTableHeaderCell>
      <CTableHeaderCell
        style="width: 120px; padding: 0.5rem 1rem; font-weight: 600;"
      >Persetujuan</CTableHeaderCell>
      <CTableHeaderCell
        style="width: 140px; padding: 0.5rem 1rem; font-weight: 600;"
      >Tanggal Persetujuan</CTableHeaderCell>
      <CTableHeaderCell
        style="width: 200px; padding: 0.5rem 1rem; font-weight: 600;"
      >Aksi</CTableHeaderCell>
    </CTableRow>
  </CTableHead>

  <CTableBody>
    <CTableRow
      v-for="api in paginatedApis"
      :key="api.id"
      style="transition: all 0.2s ease-in-out; cursor: pointer;"
      @mouseover="event.currentTarget.style.backgroundColor='#f5f5f5'"
      @mouseleave="event.currentTarget.style.backgroundColor='transparent'"
    >
      <CTableDataCell
        style="padding: 0.5rem 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
        :title="api.server"
      >{{ api.server }}</CTableDataCell>

      <CTableDataCell
        style="padding: 0.5rem 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
        :title="api.apiname"
      >{{ api.apiname }}</CTableDataCell>

      <CTableDataCell
        style="padding: 0.5rem 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
        :title="api.apiversion"
      >{{ api.apiversion }}</CTableDataCell>

      <CTableDataCell
        style="padding: 0.5rem 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
        :title="api.updateby"
      >{{ api.createdate }}</CTableDataCell>

      <CTableDataCell
        style="padding: 0.5rem 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
        :title="api.approvalmessage"
      >{{ api.approval }}</CTableDataCell>

      <CTableDataCell
        style="padding: 0.5rem 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
        :title="api.approvalby"
      >{{ api.approvaldate }}</CTableDataCell>

      <CTableDataCell style="padding: 0.5rem 1rem;">
        <CButton color="info" size="sm" title="Detail Api" @click="openModal(api)">
          📑
        </CButton>
        <CButton v-if="api.approval !== 'APPROVED'" color="warning" size="sm" title="Update Api" @click="openUpdateModal(api)">
          <CIcon name="cil-pencil" />
        </CButton>
        <CButton v-if="api.approval !== 'APPROVED'" color="danger" size="sm" title="Delete Api" @click="openDeleteModal(api.id)">
          ❌
        </CButton>
        <CButton v-if="api.approval !== 'APPROVED' && isAdmin" color="success" size="sm" title="Approve/Reject API" @click="openApprovalModal(api.id)">
          <CIcon name="cil-check" />
        </CButton>
      </CTableDataCell>
    </CTableRow>
  </CTableBody>
</CTable>
      <div
        v-if="!loading && paginatedApis.length === 0"
        style="text-align: center; padding: 1rem 0; color: #4B5563; font-weight: 600;"
      >
        Tidak ada data.
      </div>
  <!-- Navigasi View + Pagination di 1 baris -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
      <!-- Input Search (kiri) -->
      <div style="width: 100%; max-width: 33%;">
        <!-- View + Pagination langsung di jero satu div tanpa nested -->
        <label class="font-medium">View:</label>
          <select
            v-model="displayOption"
            class="border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-gray-400 "
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="all">All</option>
          </select>
      </div>
      <div style="margin-left: 560px; width: 800px;">
        <button
          class="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed transition"
          @click="goToPage(currentPage - 1)"
          :disabled="currentPage === 1"
        >
          Prev
        </button>
        <span class="font-medium"> Halaman {{ currentPage }} dari {{ totalPages }} </span>

        <button
          class="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed transition"
          @click="goToPage(currentPage + 1)"
          :disabled="currentPage === totalPages"
        >
          Next
        </button>
      </div>
    </div>

  <!-- Modal Detail API -->
    <CModal :visible="showModal" @close="showModal = false" size="lg" class="rounded-lg shadow-lg">
      <CModalHeader class="bg-gray-100 border-b border-gray-200">
        <CModalTitle>Detail API</CModalTitle>
      </CModalHeader>
      <CModalBody>
      <div v-if="selectedApi" class="space-y-4">

      <div class="row mb-3">
      <div class="col-md-3"><strong>API Name:</strong> <br>{{ selectedApi.apiname }}</div>
      <div class="col-md-3"><strong>Version:</strong> <br>{{ selectedApi.apiversion }}</div>
      <div class="col-md-3"><strong>Server:</strong> <br>{{ selectedApi.server }}</div>
      <div class="col-md-3"><strong>API Type:</strong> <br>{{ selectedApi.apitype }}</div>
      </div>
      <div class="row mb-3">
      <div class="col-md-3"><strong>Auth Type:</strong> <br>{{ selectedApi.authtype }}</div>
      <div class="col-md-3"><strong>Template:</strong> <br>{{ selectedApi.typetemplate }}</div>
      <div class="col-md-3"><strong>Path URL:</strong> <br>{{ selectedApi.pathurl }}</div>
      <div class="col-md-3 text-break"><strong>Base URL:</strong> <br>{{ selectedApi.baseurl }}</div>
      </div>
      <div class="row mb-3">
      <div class="col-md-3"><strong>Created By:</strong> <br>{{ selectedApi.createby }}</div>
      <div class="col-md-3"><strong>Created Date:</strong> <br>{{ selectedApi.createdate }}</div>
      <div class="col-md-3"><strong>Approval Status:</strong> <br>{{ selectedApi.approval }}</div>
      <div class="col-md-3"><strong>Approved By:</strong> <br>{{ selectedApi.approvalby }}</div>
      </div>
      <div class="row mb-3">
      <div class="col-md-3"><strong>Approval Date:</strong> <br>{{ selectedApi.approvaldate }}</div>
      </div>

    <!-- Header Requests Table -->
    <div>
      <strong>Header Requests</strong><br>
      <CButton color="primary" size="sm" title="Add Header" @click="openAddHeaderModal()">
        Add Header
      </CButton>
      <CTable bordered hover responsive>
        <CTableHead>
          <CTableRow>
            <CTableHeaderCell style="width: 50px">#</CTableHeaderCell>
            <CTableHeaderCell style="width: 200px">Header Key</CTableHeaderCell>
            <CTableHeaderCell style="width: 300px">Header Value</CTableHeaderCell>
            <CTableHeaderCell style="width: 75px">Action</CTableHeaderCell>
          </CTableRow>
        </CTableHead>
        <CTableBody>
          <CTableRow v-for="(header, index) in selectedApi.headerRequest?.results" :key="header.id">
            <CTableDataCell>{{ index + 1 }}</CTableDataCell>
            <CTableDataCell>{{ header.headerkey }}</CTableDataCell>
            <CTableDataCell>{{ header.headervalue }}</CTableDataCell>
            <CTableDataCell>
                      <CButton color="warning" size="sm" title="Update Api" @click="openEditHeaderModal(header)">
                        <CIcon name="cil-pencil" />
                      </CButton>
                      <CButton color="danger" size="sm" title="Delete Api" @click="deleteHeader(header.id)">
                        ❌
                      </CButton>
            </CTableDataCell>
          </CTableRow>
        </CTableBody>
      </CTable>
    </div>

    <!-- Resources Table -->
    <div>
      <strong>Resources</strong><br>
      <CButton color="primary" size="sm" title="Add Header" @click="openAddResourcesModal()">
        Add Header
      </CButton>
      <CTable bordered hover responsive>
        <CTableHead>
          <CTableRow>
            <CTableHeaderCell style="width: 50px">#</CTableHeaderCell>
            <CTableHeaderCell style="width: 200px">Method</CTableHeaderCell>
            <CTableHeaderCell style="width: 300px">Name</CTableHeaderCell>
            <CTableHeaderCell style="width: 75px">Action</CTableHeaderCell>
          </CTableRow>
        </CTableHead>
        <CTableBody>
          <CTableRow v-for="(res, index) in selectedApi.resources?.results" :key="res.id">
            <CTableDataCell>{{ index + 1 }}</CTableDataCell>
            <CTableDataCell>{{ res.methods.toUpperCase() }}</CTableDataCell>
            <CTableDataCell>{{ res.name }}</CTableDataCell>
            <CTableDataCell>
                      <CButton color="warning" size="sm" title="Update Api" @click="openEditResourcesModal(resources)">
                        <CIcon name="cil-pencil" />
                      </CButton>
                      <CButton color="danger" size="sm" title="Delete Api" @click="deleteResources(resources.id)">
                        ❌
                      </CButton>
            </CTableDataCell>
          </CTableRow>
        </CTableBody>
      </CTable>
    </div>
  </div>

      </CModalBody>
    </CModal>
  <!-- Modal Create API -->
    <CModal :visible="showCreateApiModal" @close="showCreateApiModal = false" size="lg" class="rounded-lg shadow-lg">
      <CModalHeader class="bg-gray-100 border-b border-gray-200">
        <CModalTitle>Create API</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <div class="space-y-3">
          <div>
            <label class="font-medium">Server</label>
            <select
              v-model="apiForm.server"
              style="border: 1px solid #d1d5db; border-radius: 0.25rem; padding: 0.5rem; width: 100%;"
            >
              <option value="">-- Pilih Server --</option>
              <option
                v-for="server in servers"
                :key="server.nameserver"
                :value="server.username"
              >
                {{ server.username }}
              </option>
            </select>

          </div>
          <div>
            <label class="font-medium">API Name</label>
            <input type="text" v-model="apiForm.apiName" class="form-control" placeholder="Enter API Name" />
          </div>
          <div>
            <label class="font-medium">API Version</label>
            <input type="text" v-model="apiForm.apiVersion" class="form-control" placeholder="Enter API Version" />
          </div>
          <div>
            <label class="font-medium">API Type</label>
            <select v-model="apiForm.apiType" style="padding: 6px 12px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px; width: 100%; box-sizing: border-box;">
              <option value="">-- Select Type --</option>
              <option value="REST">REST</option>
              <option value="SOAP">SOAP</option>
            </select>
          </div>
          <div>
            <label class="font-medium">Auth Type</label>
            <select v-model="apiForm.authType" style="padding: 6px 12px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px; width: 100%; box-sizing: border-box;">
              <option value="">-- Select Auth Type --</option>
              <option value="jwtClaims">JWT Claims</option>
              <option value="oAuth2Token">OAuth2 Token</option>
              <option value="httpBasicAuth">HTTP Basic Auth</option>
              <option value="apiKey">API Key</option>
              <option value="none">None</option>
            </select>
          </div>
          <div>
            <label class="font-medium">Template</label>
              <select 
                v-model="apiForm.typeTemplate"
                style="padding: 6px 12px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px; width: 100%; box-sizing: border-box;"
              >
                <option value="">-- Pilih Template --</option>
                <option 
                  v-for="item in uniqueTemplates" 
                  :key="item" 
                  :value="item"
                >
                  {{ item }}
                </option>
              </select>
          </div>
          <div>
            <label class="font-medium">Base URL</label>
            <input type="text" v-model="apiForm.baseUrl" class="form-control" placeholder="Enter Base URL" />
          </div>
          <div>
            <label class="font-medium">Path URL</label>
            <input type="text" v-model="apiForm.pathUrl" class="form-control" placeholder="Enter Path URL" />
          </div>

<!-- Header Requests -->
<div style="margin-bottom: 16px;">
  <label style="font-weight: 500; display: block; margin-bottom: 8px;">Header Requests</label>

  <div
    v-for="(header, idx) in apiForm.headerRequest"
    :key="idx"
    style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; padding: 8px; border-radius: 6px; border: 1px solid #d1d5db;"
  >
    <input
      type="text"
      v-model="header[0]"
      placeholder="Header Key"
      style="flex: 1; padding: 6px 8px; border: 1px solid #ccc; border-radius: 4px;"
    />
    <input
      type="text"
      v-model="header[1]"
      placeholder="Header Value"
      style="flex: 1; padding: 6px 8px; border: 1px solid #ccc; border-radius: 4px;"
    />
    <CButton
      size="sm"
      color="danger"
      variant="outline"
      @click="apiForm.headerRequest.splice(idx, 1)"
      title="Remove Header"
      style="background-color: transparent; border: 1px solid #dc3545; color: #dc3545; padding: 4px 8px; border-radius: 4px; cursor: pointer;"
    >
      ❌
    </CButton>
  </div>

  <CButton
    size="sm"
    color="success"
    variant="outline"
    @click="apiForm.headerRequest.push(['', ''])"
    style="background-color: transparent; border: 1px solid #198754; color: #198754; padding: 4px 8px; border-radius: 4px; cursor: pointer;"
  >
    ➕ Add Header
  </CButton>
</div>

<!-- API Resources -->
<div>
  <label style="font-weight: 500; display: block; margin-bottom: 8px;">API Resources</label>

  <div
    v-for="(res, idx) in apiForm.apiResources"
    :key="idx"
    style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; padding: 8px; border-radius: 6px; border: 1px solid #d1d5db;"
  >
    <input
      type="text"
      v-model="res[0]"
      placeholder="Resource Name"
      style="flex: 1; padding: 6px 8px; border: 1px solid #ccc; border-radius: 4px;"
    />
    <select
      v-model="res[1]"
      style="flex: 1; padding: 6px 8px; border: 1px solid #ccc; border-radius: 4px;"
    >
      <option value="">-- Method --</option>
      <option value="get">GET</option>
      <option value="post">POST</option>
      <option value="put">PUT</option>
      <option value="delete">DELETE</option>
    </select>
    <CButton
      size="sm"
      color="danger"
      variant="outline"
      @click="apiForm.apiResources.splice(idx, 1)"
      title="Remove Resource"
      style="background-color: transparent; border: 1px solid #dc3545; color: #dc3545; padding: 4px 8px; border-radius: 4px; cursor: pointer;"
    >
      ❌
    </CButton>
  </div>

  <CButton
    size="sm"
    color="success"
    variant="outline"
    @click="apiForm.apiResources.push(['', ''])"
    style="background-color: transparent; border: 1px solid #198754; color: #198754; padding: 4px 8px; border-radius: 4px; cursor: pointer;"
  >
    ➕ Add Resource
  </CButton>
</div>


        </div>
      </CModalBody>
      <CModalFooter>
        <CButton color="primary" @click="createApi">Save</CButton>
      </CModalFooter>
    </CModal>
  <!-- Modal Update API -->
   <CModal :visible="showUpdateApiModal" @close="showUpdateApiModal = false" size="lg" class="rounded-lg shadow-lg">
  <CModalHeader class="bg-gray-100 border-b border-gray-200">
    <CModalTitle>Update API</CModalTitle>
  </CModalHeader>
  <CModalBody>
    <div class="space-y-3">
      <div>
        <label class="font-medium">Server</label>
        <select
          v-model="updateForm.server"
          style="border: 1px solid #d1d5db; border-radius: 0.25rem; padding: 0.5rem; width: 100%;"
        >
          <option value="">-- Pilih Server --</option>
          <option
            v-for="server in servers"
            :key="server.nameserver"
            :value="server.username"
          >
            {{ server.username }}
          </option>
        </select>
      </div>
      <div>
        <label class="font-medium">API Name</label>
        <input type="text" v-model="updateForm.apiName" class="form-control" placeholder="Enter API Name" />
      </div>
      <div>
        <label class="font-medium">API Version</label>
        <input type="text" v-model="updateForm.apiVersion" class="form-control" placeholder="Enter API Version" />
      </div>
      <div>
        <label class="font-medium">API Type</label>
        <select v-model="updateForm.apiType" style="padding: 6px 12px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px; width: 100%; box-sizing: border-box;">
          <option value="">-- Select Type --</option>
          <option value="REST">REST</option>
          <option value="SOAP">SOAP</option>
        </select>
      </div>
      <div>
        <label class="font-medium">Auth Type</label>
        <select v-model="updateForm.authType" style="padding: 6px 12px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px; width: 100%; box-sizing: border-box;">
          <option value="">-- Select Auth Type --</option>
          <option value="jwtClaims">JWT Claims</option>
          <option value="oAuth2Token">OAuth2 Token</option>
          <option value="httpBasicAuth">HTTP Basic Auth</option>
          <option value="apiKey">API Key</option>
          <option value="none">None</option>
        </select>
      </div>
      <div>
        <label class="font-medium">Template</label>
        <select 
          v-model="updateForm.typeTemplate"
          style="padding: 6px 12px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px; width: 100%; box-sizing: border-box;"
        >
          <option value="">-- Pilih Template --</option>
          <option 
            v-for="item in uniqueTemplates" 
            :key="item" 
            :value="item"
          >
            {{ item }}
          </option>
        </select>
      </div>
      <div>
        <label class="font-medium">Base URL</label>
        <input type="text" v-model="updateForm.baseUrl" class="form-control" placeholder="Enter Base URL" />
      </div>
      <div>
        <label class="font-medium">Path URL</label>
        <input type="text" v-model="updateForm.pathUrl" class="form-control" placeholder="Enter Path URL" />
      </div>

      <!-- Header Requests -->
      <div style="margin-bottom: 16px;">
        <label style="font-weight: 500; display: block; margin-bottom: 8px;">Header Requests</label>

        <div
          v-for="(header, idx) in updateForm.headerRequest"
          :key="idx"
          style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; padding: 8px; border-radius: 6px; border: 1px solid #d1d5db;"
        >
          <input
            type="text"
            v-model="header[0]"
            placeholder="Header Key"
            style="flex: 1; padding: 6px 8px; border: 1px solid #ccc; border-radius: 4px;"
          />
          <input
            type="text"
            v-model="header[1]"
            placeholder="Header Value"
            style="flex: 1; padding: 6px 8px; border: 1px solid #ccc; border-radius: 4px;"
          />
          <CButton
            size="sm"
            color="danger"
            variant="outline"
            @click="updateForm.headerRequest.splice(idx, 1)"
            title="Remove Header"
            style="background-color: transparent; border: 1px solid #dc3545; color: #dc3545; padding: 4px 8px; border-radius: 4px; cursor: pointer;"
          >
            ❌
          </CButton>
        </div>

        <CButton
          size="sm"
          color="success"
          variant="outline"
          @click="updateForm.headerRequest.push(['', ''])"
          style="background-color: transparent; border: 1px solid #198754; color: #198754; padding: 4px 8px; border-radius: 4px; cursor: pointer;"
        >
          ➕ Add Header
        </CButton>
      </div>

      <!-- API Resources -->
      <div>
        <label style="font-weight: 500; display: block; margin-bottom: 8px;">API Resources</label>

        <div
          v-for="(res, idx) in updateForm.apiResources"
          :key="idx"
          style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; padding: 8px; border-radius: 6px; border: 1px solid #d1d5db;"
        >
          <input
            type="text"
            v-model="res[0]"
            placeholder="Resource Name"
            style="flex: 1; padding: 6px 8px; border: 1px solid #ccc; border-radius: 4px;"
          />
          <select
            v-model="res[1]"
            style="flex: 1; padding: 6px 8px; border: 1px solid #ccc; border-radius: 4px;"
          >
            <option value="">-- Method --</option>
            <option value="get">GET</option>
            <option value="post">POST</option>
            <option value="put">PUT</option>
            <option value="delete">DELETE</option>
          </select>
          <CButton
            size="sm"
            color="danger"
            variant="outline"
            @click="updateForm.apiResources.splice(idx, 1)"
            title="Remove Resource"
            style="background-color: transparent; border: 1px solid #dc3545; color: #dc3545; padding: 4px 8px; border-radius: 4px; cursor: pointer;"
          >
            ❌
          </CButton>
        </div>

        <CButton
          size="sm"
          color="success"
          variant="outline"
          @click="updateForm.apiResources.push(['', ''])"
          style="background-color: transparent; border: 1px solid #198754; color: #198754; padding: 4px 8px; border-radius: 4px; cursor: pointer;"
        >
          ➕ Add Resource
        </CButton>
      </div>
    </div>
  </CModalBody>
  <CModalFooter>
    <CButton color="primary" @click="updateApi">Update</CButton>
  </CModalFooter>
</CModal>
  <!-- Modal Approval -->
    <CModal
      :visible="showApprovalModal"
      @close="showApprovalModal = false"
      size="md"
      class="rounded-lg shadow-lg"
    >
      <CModalHeader class="bg-gray-100 border-b border-gray-200">
        <CModalTitle>Approval API</CModalTitle>
      </CModalHeader>

      <CModalBody>
        <div>
          <label>
            <input type="radio" value="APPROVED" v-model="approvalStatus" />
            Approved
          </label>
          <label style="margin-left: 20px;">
            <input type="radio" value="REJECTED" v-model="approvalStatus" />
            Rejected
          </label>
        </div>

        <div v-if="approvalStatus === 'REJECTED'" style="margin-top: 12px;">
          <label for="approvalMessage" style="font-weight: 500;">Approval Message</label>
          <textarea
            id="approvalMessage"
            v-model="approvalMessage"
            rows="3"
            placeholder="Masukkan pesan alasan reject"
            style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;"
          ></textarea>
        </div>
      </CModalBody>

      <CModalFooter>
        <CButton color="secondary" @click="showApprovalModal = false">Cancel</CButton>
        <CButton color="primary" @click="submitApproval">Submit</CButton>
      </CModalFooter>
    </CModal>

    <!-- Modal Delete -->
     <CModal
      :visible="showDeleteModal"
      @close="showDeleteModal = false"
      size="sm"
      class="rounded-lg shadow-lg"
    >
      <CModalHeader class="bg-gray-100 border-b border-gray-200">
        <CModalTitle>Konfirmasi Delete</CModalTitle>
      </CModalHeader>

      <CModalBody>
        Apakah Anda yakin ingin menghapus API ini?
      </CModalBody>

      <CModalFooter>
        <CButton color="secondary" @click="showDeleteModal = false">Batal</CButton>
        <CButton color="danger" @click="deleteApi">Hapus</CButton>
      </CModalFooter>
    </CModal>

</template>