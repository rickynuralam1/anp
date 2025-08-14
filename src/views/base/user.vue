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
const showupdateUserModal = ref(false) // modal update
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
  role: '',
  is_active: ''
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
      '/api/restv2/createApi/user/getAllUser',
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

// Fungsi buka modal update dan isi form update dengan data api yang dipilih
const openUpdateModal = (api) => {
  updateForm.value = {
    id: api.id || '',
    role: api.role || '',
    is_active: api.is_active || ''
  }
  showupdateUserModal.value = true
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
      role: updateForm.value.role,
      isActive: updateForm.value.is_active
    }

    const res = await axios.post(
      '/api/restv2/createApi/user/userActive',
      JSON.stringify(payload),
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Basic QWRtaW46bWFuYWdl'
        }
      }
    )

    if (res.data.responseDesc !== 'success') {
      alert('Failed to update user: ' + (res.data.responseMessage || 'Unknown error'))
      return
    }

    alert('User Update Successfully!')
    showupdateUserModal.value = false
    await fetchData()
    await fetchTemplatePolicies()
  } catch (err) {
    const msg = err.response?.data?.message || err.message
    if (err.response?.status === 401) {
      redirectToLogin(msg)
    } else {
      console.error('Error updating User:', msg)
      alert('Failed to update User: ' + msg)
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
const deleteUserId = ref(null)

const openDeleteModal = (id) => {
  deleteUserId.value = id
  showDeleteModal.value = true
}

const deleteUser = async () => {
  try {
    const token = localStorage.getItem('token')
    if (!token) {
      redirectToLogin()
      return
    }

    const payload = {
      token,
      id: deleteUserId.value,
    }

    const res = await axios.post(
      '/api/restv2/createApi/user/deleteUser',
      JSON.stringify(payload),
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Basic QWRtaW46bWFuYWdl'
        }
      }
    )

    if (res.data.responseDesc !== 'success') {
      alert('Failed to delete user: ' + (res.data.responseMessage || 'Unknown error'))
      return
    }

    alert('User deleted successfully!')
    showDeleteModal.value = false
    deleteUserId.value = null
    await fetchData()
  } catch (err) {
    const msg = err.response?.data?.message || err.message
    if (err.response?.status === 401) {
      redirectToLogin(msg)
    } else {
      console.error('Error deleting Server:', msg)
      alert('Failed to delete user: ' + msg)
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
      '/api/restv2/createApi/user/getAllUser',
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
      >Email</CTableHeaderCell>
      <CTableHeaderCell
        style="width: 200px; padding: 0.5rem 1rem; font-weight: 600;"
      >Full Name</CTableHeaderCell>
      <CTableHeaderCell
        style="width: 100px; padding: 0.5rem 1rem; font-weight: 600;"
      >Role</CTableHeaderCell>
      <CTableHeaderCell
        style="width: 140px; padding: 0.5rem 1rem; font-weight: 600;"
      >Is Active</CTableHeaderCell>
      <CTableHeaderCell
        style="width: 140px; padding: 0.5rem 1rem; font-weight: 600;"
      >Created At</CTableHeaderCell>
      <CTableHeaderCell
        style="width: 140px; padding: 0.5rem 1rem; font-weight: 600;"
      >Updated At</CTableHeaderCell>
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
        :title="api.email"
      >{{ api.email }}</CTableDataCell>

      <CTableDataCell
        style="padding: 0.5rem 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
        :title="api.full_name"
      >{{ api.full_name }}</CTableDataCell>

      <CTableDataCell
        style="padding: 0.5rem 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
        :title="api.role"
      >{{ api.role }}</CTableDataCell>

      <CTableDataCell
        style="padding: 0.5rem 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
        :title="api.is_active"
      >{{ api.is_active }}</CTableDataCell>

      <CTableDataCell
        style="padding: 0.5rem 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
        :title="api.created_at"
      >{{ api.created_at }}</CTableDataCell>

      <CTableDataCell
        style="padding: 0.5rem 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
        :title="api.updated_at"
      >{{ api.updated_at }}</CTableDataCell>

      <CTableDataCell style="padding: 0.5rem 1rem;">
        <CButton v-if="isAdmin" color="warning" size="sm" title="Update Server" @click="openUpdateModal(api)">
          <CIcon name="cil-pencil" />
        </CButton>
        <CButton v-if="isAdmin" color="danger" size="sm" title="Delete Server" @click="openDeleteModal(api.id)">
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

  <!-- Modal Update API -->
<CModal
  :visible="showupdateUserModal"
  @close="showupdateUserModal = false"
  class="rounded-lg shadow-lg"
>
  <CModalHeader class="bg-gray-50 border-b border-gray-100">
    <CModalTitle>Update User</CModalTitle>
  </CModalHeader>
          <CModalBody>
            <div class="space-y-3">
              <div>
                <label class="font-medium">Role</label>
                <select v-model="updateForm.role" style="padding: 6px 12px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px; width: 100%; box-sizing: border-box;">
                  <option value="developer">Developer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label class="font-medium">isActive</label>
                <select v-model="updateForm.is_active" style="padding: 6px 12px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px; width: 100%; box-sizing: border-box;">
                  <option value="true">True</option>
                  <option value="false">False</option>
                </select>
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
        Apakah Anda yakin ingin menghapus User ini?
      </CModalBody>

      <CModalFooter>
        <CButton color="secondary" @click="showDeleteModal = false">Batal</CButton>
        <CButton color="danger" @click="deleteUser">Hapus</CButton>
      </CModalFooter>
    </CModal>

</template>