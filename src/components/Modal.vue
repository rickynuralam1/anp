<template>
  <CModal :visible="visible" @close="$emit('close')" size="xl">
    <CModalHeader>
      <CModalTitle>Detail Publikasi Penelitian</CModalTitle>
    </CModalHeader>
    <CModalBody>
      <div v-if="publication">
        <h5>Judul: {{ publication.title }}</h5>
        <p><strong>Tipe:</strong> {{ publication.publication_type }}</p>
        <!-- dan seterusnya... -->
      </div>
    </CModalBody>
  </CModal>
</template>

<script setup>
defineProps({
  visible: Boolean,
  publication: Object,
})
defineEmits(['close'])

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('id-ID', {
    year: 'numeric', month: 'long', day: 'numeric'
  })
}
</script>
