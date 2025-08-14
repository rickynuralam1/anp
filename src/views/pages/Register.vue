<template>
  <div class="bwrapper min-vh-100 d-flex flex-row align-items-center">
    <CContainer>
      <CRow class="justify-content-center">
        <CCol :md="9" :lg="7" :xl="6">
          <CCard class="mx-4">
            <CCardBody class="p-4">
              <CForm @submit.prevent="registerUser">
                <h1>Register</h1>
                <p class="text-body-secondary">Create your account</p>

                <CInputGroup class="mb-3">
                  <CInputGroupText>
                    <CIcon icon="cil-user" />
                  </CInputGroupText>
                  <CFormInput
                    v-model="form.fullName"
                    placeholder="Full Name"
                    autocomplete="name"
                    required
                  />
                </CInputGroup>

                <CInputGroup class="mb-3">
                  <CInputGroupText>@</CInputGroupText>
                  <CFormInput
                    v-model="form.email"
                    placeholder="Email"
                    autocomplete="email"
                    required
                  />
                </CInputGroup>

                <CInputGroup class="mb-3">
                  <CInputGroupText>
                    <CIcon icon="cil-lock-locked" />
                  </CInputGroupText>
                  <CFormInput
                    v-model="form.password"
                    type="password"
                    placeholder="Password"
                    autocomplete="new-password"
                    required
                  />
                </CInputGroup>

                <CInputGroup class="mb-4">
                  <CInputGroupText>
                    <CIcon icon="cil-lock-locked" />
                  </CInputGroupText>
                  <CFormInput
                    v-model="form.repeatPassword"
                    type="password"
                    placeholder="Repeat password"
                    autocomplete="new-password"
                    required
                  />
                </CInputGroup>

                <div style="display: flex; gap: 10px; justify-content: center;">
                  <CButton color="success" type="submit" :disabled="loading">
                    {{ loading ? 'Processing...' : 'Create Account' }}
                  </CButton>
                  <RouterLink to="/login">
                    <CButton color="secondary" variant="outline">Back to Login</CButton>
                  </RouterLink>
                </div>

                <p v-if="errorMessage" style="color: red; margin-top: 10px; text-align: center;">
                  {{ errorMessage }}
                </p>
              </CForm>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </CContainer>
  </div>
</template>

<script>
import axios from 'axios'

export default {
  data() {
    return {
      form: {
        fullName: '',
        email: '',
        password: '',
        repeatPassword: '',
      },
      loading: false,
      errorMessage: '',
    }
  },
  methods: {
    async registerUser() {
      this.errorMessage = ''

      if (this.form.password !== this.form.repeatPassword) {
        this.errorMessage = 'Password and Repeat Password do not match'
        return
      }

      this.loading = true
      try {
        const response = await axios.post(
          '/api/restv2/createApi/user/registrasiUser', // pakai proxy biar aman CORS
          {
            email: this.form.email,
            password: this.form.password,
            fullName: this.form.fullName,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Basic QWRtaW46bWFuYWdl',
            },
          }
        )

        const res = response.data
        console.log('Registration success:', res)
        alert('Registration successful!')
        this.$router.push('/login')
      } catch (err) {
        console.error('Registration failed:', err)
        this.errorMessage =
          err.response?.data?.responseMessage ||
          'Registration failed, please try again.'
      } finally {
        this.loading = false
      }
    },
  },
}
</script>
