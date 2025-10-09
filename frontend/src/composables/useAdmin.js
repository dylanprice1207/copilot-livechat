import { ref } from 'vue'

const alert = ref({
  show: false,
  message: '',
  type: 'success'
})

export function useAdmin() {
  const showAlert = (message, type = 'success') => {
    alert.value = {
      show: true,
      message,
      type
    }
    
    setTimeout(() => {
      alert.value.show = false
    }, 5000)
  }

  const hideAlert = () => {
    alert.value.show = false
  }

  return {
    alert,
    showAlert,
    hideAlert
  }
}