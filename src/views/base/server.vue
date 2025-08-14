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
const showCreateServerModal = ref(false)
const showUpdateServerModal = ref(false) // modal update
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
  nameserver: '',
  ip: '',
  user: '',
  password: ''
})

// ===== UPDATE API FORM =====
const updateForm = ref({
  id: '',
  nameserver: '',
  ip: '',
  user: '',
  password: ''
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

const createServer = async () => {
  try {
    const token = localStorage.getItem('token')
    if (!token) {
      redirectToLogin()
      return
    }

    const payload = {
      token,
      nameserver: apiForm.value.nameserver,
      ip: apiForm.value.ip,
      user: apiForm.value.user,
      password: apiForm.value.password
    }

    const res = await axios.post(
      '/api/restv2/createApi/server/inputServer',
      JSON.stringify(payload),
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Basic QWRtaW46bWFuYWdl'
        }
      }
    )

    if (res.data.responseDesc !== 'success') {
      alert('Failed to create Server: ' + (res.data.responseMessage || 'Unknown error'))
      return
    }

    alert('API Created Successfully!')
    showCreateServerModal.value = false
    await fetchData()
    await fetchTemplatePolicies()
  } catch (err) {
    const msg = err.response?.data?.message || err.message
    if (err.response?.status === 401) {
      redirectToLogin(msg)
    } else {
      console.error('Error creating server:', msg)
      alert('Failed to create Server: ' + msg)
    }
  }
}

// Fungsi buka modal update dan isi form update dengan data api yang dipilih
const openUpdateModal = (api) => {
  updateForm.value = {
    id: api.nameserver || '',
    nameserver: api.username || '',
    ip: api.ip || '',
    user: api.user || '',
    password: api.password || ''
  }
  showUpdateServerModal.value = true
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

    const payload = {
      token,
      id: updateForm.value.id,
      nameServer: updateForm.value.nameserver,
      ip: updateForm.value.ip,
      user: updateForm.value.user,
      password: updateForm.value.password
    }

    const res = await axios.post(
      '/api/restv2/createApi/server/updateServer',
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
    showUpdateServerModal.value = false
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
      alert('Gagal approval: ' + (res.data.responseMessage || 'Unknown error'))
    }
  } catch (error) {
    alert('Error saat approval: ' + (error.message || error))
  }
}

// ===== Delete Modal dan Fungsi =====

const showDeleteModal = ref(false)
const deleteServerId = ref(null)

const openDeleteModal = (id) => {
  deleteServerId.value = id
  showDeleteModal.value = true
}

const deleteServer = async () => {
  try {
    const token = localStorage.getItem('token')
    if (!token) {
      redirectToLogin()
      return
    }

    const payload = {
      token,
      id: deleteServerId.value,
    }

    const res = await axios.post(
      '/api/restv2/createApi/server/deleteServer',
      JSON.stringify(payload),
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Basic QWRtaW46bWFuYWdl'
        }
      }
    )

    if (res.data.responseDesc !== 'success') {
      alert('Failed to delete server: ' + (res.data.responseMessage || 'Unknown error'))
      return
    }

    alert('Server deleted successfully!')
    showDeleteModal.value = false
    deleteServerId.value = null
    await fetchData()
  } catch (err) {
    const msg = err.response?.data?.message || err.message
    if (err.response?.status === 401) {
      redirectToLogin(msg)
    } else {
      console.error('Error deleting Server:', msg)
      alert('Failed to delete Server: ' + msg)
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
      '/api/restv2/createApi/server/getServer',
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

      <!-- Tombol Add Server (kanan) -->
      <div style="margin-left: 1000px; width: 800px;">
        <CButton color="primary" size="sm" title="Add Server" @click="showCreateServerModal = true">
          Add Server
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
      >IP</CTableHeaderCell>
      <CTableHeaderCell
        style="width: 100px; padding: 0.5rem 1rem; font-weight: 600;"
      >User</CTableHeaderCell>
      <CTableHeaderCell
        style="width: 140px; padding: 0.5rem 1rem; font-weight: 600;"
      >Password</CTableHeaderCell>
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
        :title="api.username"
      >{{ api.username }}</CTableDataCell>

      <CTableDataCell
        style="padding: 0.5rem 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
        :title="api.ip"
      >{{ api.ip }}</CTableDataCell>

      <CTableDataCell
        style="padding: 0.5rem 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
        :title="api.user"
      >{{ api.user }}</CTableDataCell>

      <CTableDataCell
        style="padding: 0.5rem 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
        :title="api.password"
      >{{ api.password }}</CTableDataCell>

      <CTableDataCell style="padding: 0.5rem 1rem;">
        <CButton v-if="isAdmin" color="warning" size="sm" title="Update Server" @click="openUpdateModal(api)">
          <CIcon name="cil-pencil" />
        </CButton>
        <CButton v-if="isAdmin" color="danger" size="sm" title="Delete Server" @click="openDeleteModal(api.nameserver)">
          ❌
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
      <div class="col-md-3"><strong>Base URL:</strong> <br>{{ selectedApi.baseurl }}</div>
      <div class="col-md-3"><strong>Path URL:</strong> <br>{{ selectedApi.pathurl }}</div>
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
  <!-- Modal Create Server -->
    <CModal :visible="showCreateServerModal" @close="showCreateServerModal = false" size="lg" class="rounded-lg shadow-lg">
      <CModalHeader class="bg-gray-100 border-b border-gray-200">
        <CModalTitle>Create Server</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <div class="space-y-3">
          <div>
            <label class="font-medium">Name Server</label>
            <input type="text" v-model="apiForm.nameserver" class="form-control" placeholder="Enter Name Server" />
          </div>
          <div>
            <label class="font-medium">IP</label>
            <input type="text" v-model="apiForm.ip" class="form-control" placeholder="Enter IP" />
          </div>
          <div>
            <label class="font-medium">User</label>
            <input type="text" v-model="apiForm.user" class="form-control" placeholder="Enter User" />
          </div>
          <div>
            <label class="font-medium">Password</label>
            <input type="text" v-model="apiForm.password" class="form-control" placeholder="Enter Password" />
          </div>
        </div>
      </CModalBody>
      <CModalFooter>
        <CButton color="primary" @click="createServer">Save</CButton>
      </CModalFooter>
    </CModal>
  <!-- Modal Update API -->
   <CModal :visible="showUpdateServerModal" @close="showUpdateServerModal = false" size="lg" class="rounded-lg shadow-lg">
  <CModalHeader class="bg-gray-100 border-b border-gray-200">
    <CModalTitle>Update API</CModalTitle>
  </CModalHeader>
  <CModalBody>
    <div class="space-y-3">
      <div>
        <label class="font-medium">Name Server</label>
        <input type="text" v-model="updateForm.nameserver" class="form-control" placeholder="Enter Name Server" />
      </div>
      <div>
        <label class="font-medium">IP</label>
        <input type="text" v-model="updateForm.ip" class="form-control" placeholder="Enter IP" />
      </div>
      <div>
        <label class="font-medium">User</label>
        <input type="text" v-model="updateForm.user" class="form-control" placeholder="Enter User" />
      </div>
      <div>
        <label class="font-medium">Password</label>
        <input type="text" v-model="updateForm.password" class="form-control" placeholder="Enter Password" />
      </div>
    </div>
  </CModalBody>
  <CModalFooter>
    <CButton color="primary" @click="updateApi">Update</CButton>
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
        Apakah Anda yakin ingin menghapus Server ini?
      </CModalBody>

      <CModalFooter>
        <CButton color="secondary" @click="showDeleteModal = false">Batal</CButton>
        <CButton color="danger" @click="deleteServer">Hapus</CButton>
      </CModalFooter>
    </CModal>

</template>