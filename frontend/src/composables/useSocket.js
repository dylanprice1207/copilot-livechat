import { ref, onMounted, onUnmounted } from 'vue'
import io from 'socket.io-client'

let socketInstance = null
const socket = ref(null)
const isConnected = ref(false)

export function useSocket() {
  const connect = () => {
    if (!socketInstance) {
      console.log('🔌 Connecting to socket...')
      const serverUrl = import.meta.env.VITE_SERVER_URL || window.location.origin
      socketInstance = io(serverUrl, {
        transports: ['websocket', 'polling']
      })
      
      socketInstance.on('connect', () => {
        isConnected.value = true
        socket.value = socketInstance
        console.log('✅ Socket connected:', socketInstance.id)
      })
      
      socketInstance.on('disconnect', () => {
        isConnected.value = false
        socket.value = null
        console.log('❌ Socket disconnected')
      })

      socketInstance.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error)
        socket.value = null
      })
    }
    
    return socketInstance
  }

  const disconnect = () => {
    if (socketInstance) {
      socketInstance.disconnect()
      socketInstance = null
      socket.value = null
      isConnected.value = false
    }
  }

  const emit = (event, data) => {
    if (socketInstance && socketInstance.connected) {
      socketInstance.emit(event, data)
    }
  }

  const on = (event, callback) => {
    if (socketInstance) {
      socketInstance.on(event, callback)
    }
  }

  const off = (event, callback) => {
    if (socketInstance) {
      socketInstance.off(event, callback)
    }
  }

  // Auto-connect
  if (!socketInstance) {
    connect()
  }

  return {
    socket,
    isConnected,
    connect,
    disconnect,
    emit,
    on,
    off
  }
}