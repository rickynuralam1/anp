<script setup>
import avatar from '@/assets/images/avatars/8.jpg'
import { useRouter } from 'vue-router'

const router = useRouter()
const itemsCount = 42

const handleLogout = async () => {
  const id = localStorage.getItem('id')
  const token = localStorage.getItem('token')
  console.log('Logout clicked, id:', id, 'token:', token)

  if (!id || !token) {
    alert('ID atau Token tidak ditemukan. Silakan login ulang.')
    return
  }

  try {
    const response = await fetch('/api/restv2/createApi/user/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic QWRtaW46bWFuYWdl',
      },
      body: JSON.stringify({ id, token }),
    })

    if (response.ok) {
      localStorage.removeItem('id')
      localStorage.removeItem('token')
      router.push('/pages/login') // Gunakan router push agar tidak reload
    } else {
      const resText = await response.text()
      console.error('Logout gagal:', resText)
      alert('Logout gagal!')
    }
  } catch (e) {
    console.error('Terjadi kesalahan saat logout:', e)
    alert('Terjadi kesalahan saat logout!')
  }
}
</script>

<template>
  <CDropdown placement="bottom-end" variant="nav-item">
    <CDropdownToggle class="py-0 pe-0" :caret="false">
      <CAvatar :src="avatar" size="md" />
    </CDropdownToggle>
    <CDropdownMenu class="pt-0">
      <CDropdownHeader
        component="h6"
        class="bg-body-secondary text-body-secondary fw-semibold mb-2 rounded-top"
      >
        Account
      </CDropdownHeader>
      <CDropdownItem>
        <CIcon icon="cil-bell" /> Updates
        <CBadge color="info" class="ms-auto">{{ itemsCount }}</CBadge>
      </CDropdownItem>
      <CDropdownItem>
        <CIcon icon="cil-envelope-open" /> Messages
        <CBadge color="success" class="ms-auto">{{ itemsCount }}</CBadge>
      </CDropdownItem>
      <CDropdownItem>
        <CIcon icon="cil-task" /> Tasks
        <CBadge color="danger" class="ms-auto">{{ itemsCount }}</CBadge>
      </CDropdownItem>
      <CDropdownItem>
        <CIcon icon="cil-comment-square" /> Comments
        <CBadge color="warning" class="ms-auto">{{ itemsCount }}</CBadge>
      </CDropdownItem>
      <CDropdownHeader
        component="h6"
        class="bg-body-secondary text-body-secondary fw-semibold my-2"
      >
        Settings
      </CDropdownHeader>
      <CDropdownItem><CIcon icon="cil-user" /> Profile</CDropdownItem>
      <CDropdownItem><CIcon icon="cil-settings" /> Settings</CDropdownItem>
      <CDropdownItem>
        <CIcon icon="cil-dollar" /> Payments
        <CBadge color="secondary" class="ms-auto">{{ itemsCount }}</CBadge>
      </CDropdownItem>
      <CDropdownItem>
        <CIcon icon="cil-file" /> Projects
        <CBadge color="primary" class="ms-auto">{{ itemsCount }}</CBadge>
      </CDropdownItem>
      <CDropdownDivider />
      <CDropdownItem><CIcon icon="cil-shield-alt" /> Lock Account</CDropdownItem>
      <CDropdownItem @click="handleLogout">
        <CIcon icon="cil-lock-locked" /> Logout
      </CDropdownItem>
    </CDropdownMenu>
  </CDropdown>
</template>
