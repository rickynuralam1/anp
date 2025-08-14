<template>
  <div class="wrapper min-vh-100 d-flex flex-row align-items-center">
    <CContainer>
      <CRow class="justify-content-center">
        <CCol :md="8">
          <CCardGroup>
            <!-- Kartu Login -->
            <CCard class="p-4">
              <CCardBody>
                <CForm @submit.prevent="handleLogin">
                  <h1>Login</h1>
                  <p class="text-body-secondary">Sign In to your account</p>

                  <CInputGroup class="mb-3">
                    <CInputGroupText>
                      <CIcon icon="cil-user" />
                    </CInputGroupText>
                    <CFormInput
                      v-model="email"
                      placeholder="Email"
                      autocomplete="username"
                      required
                    />
                  </CInputGroup>

                  <CInputGroup class="mb-4">
                    <CInputGroupText>
                      <CIcon icon="cil-lock-locked" />
                    </CInputGroupText>
                    <CFormInput
                      v-model="password"
                      type="password"
                      placeholder="Password"
                      autocomplete="current-password"
                      required
                    />
                  </CInputGroup>

                  <p v-if="errorMessage" style="color: red">{{ errorMessage }}</p>

                  <CRow>
                    <CCol :xs="6">
                      <CButton type="submit" color="primary" class="px-4" :disabled="loading">
                        {{ loading ? 'Loading...' : 'Login' }}
                      </CButton>
                    </CCol>
                  </CRow>
                </CForm>
              </CCardBody>
            </CCard>

            <!-- Kartu Samping -->
            <CCard class="text-white bg-primary py-5" style="width: 44%">
              <CCardBody class="text-center">
                <div>
                  <h2>Sign up</h2>
                  <p>
                    Register your account now and start building APIs and Pipelines quickly and easily using ANP Engine.
                  </p>
                  <RouterLink to="register">
                    <CButton color="light" variant="outline" class="mt-3">
                      Register Now!
                    </CButton>
                  </RouterLink>
                </div>
              </CCardBody>
            </CCard>
          </CCardGroup>
        </CCol>
      </CRow>
    </CContainer>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const email = ref('')
const password = ref('')
const errorMessage = ref('')
const loading = ref(false)
const router = useRouter()

const handleLogin = async () => {
  errorMessage.value = ''
  loading.value = true

  try {
    const response = await axios.post(
      '/api/restv2/createApi/user/login', // GUNAKAN PROXY di Vite
      {
        email: email.value,
        password: password.value,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Basic QWRtaW46bWFuYWdl',
        },
      }
    )

    const res = response.data

    if (res.responseDesc === 'success' && res.responseData?.token) {
      const user = res.responseData
      localStorage.setItem('token', user.token)
      localStorage.setItem('role', user.role)
      localStorage.setItem('id', user.id)
      localStorage.setItem('user', JSON.stringify(user))
      router.push('/dashboard')
    } else {
      errorMessage.value = res.responseMessage || 'Login gagal. Cek kembali email dan password.'
    }
  } catch (err) {
    console.error('Login error:', err)
    errorMessage.value =
      err.response?.data?.responseMessage || 'Login gagal. Server tidak merespons dengan benar.'
  } finally {
    loading.value = false
  }
}
</script>
