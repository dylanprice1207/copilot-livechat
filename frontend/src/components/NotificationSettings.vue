<template>
  <div class="notification-settings">
    <div class="settings-header">
      <h2><i class="fas fa-bell"></i> Notification Settings</h2>
      <p>Configure notification preferences and delivery methods</p>
    </div>
    
    <div class="settings-form">
      <div class="notification-types">
        <h3>Notification Types</h3>
        <div class="form-grid">
          <div class="form-group">
            <div class="checkbox-item">
              <input 
                type="checkbox" 
                id="emailNotifications"
                v-model="localSettings.email"
              />
              <label for="emailNotifications">Email Notifications</label>
            </div>
          </div>
          
          <div class="form-group">
            <div class="checkbox-item">
              <input 
                type="checkbox" 
                id="browserNotifications"
                v-model="localSettings.browser"
              />
              <label for="browserNotifications">Browser Notifications</label>
            </div>
          </div>
          
          <div class="form-group">
            <div class="checkbox-item">
              <input 
                type="checkbox" 
                id="soundNotifications"
                v-model="localSettings.sound"
              />
              <label for="soundNotifications">Sound Notifications</label>
            </div>
          </div>

          <div class="form-group">
            <div class="checkbox-item">
              <input 
                type="checkbox" 
                id="smsNotifications"
                v-model="localSettings.sms"
              />
              <label for="smsNotifications">SMS Notifications</label>
            </div>
          </div>

          <div class="form-group">
            <div class="checkbox-item">
              <input 
                type="checkbox" 
                id="desktopNotifications"
                v-model="localSettings.desktop"
              />
              <label for="desktopNotifications">Desktop Notifications</label>
            </div>
          </div>

          <div class="form-group">
            <div class="checkbox-item">
              <input 
                type="checkbox" 
                id="slackNotifications"
                v-model="localSettings.slack"
              />
              <label for="slackNotifications">Slack Notifications</label>
            </div>
          </div>
        </div>
      </div>

      <div class="email-settings">
        <h3>Email Settings</h3>
        <div class="form-grid">
          <div class="form-group">
            <label for="notificationEmail">Primary Notification Email</label>
            <input 
              type="email" 
              id="notificationEmail"
              v-model="localSettings.notificationEmail" 
              placeholder="admin@example.com"
              class="form-control"
            />
          </div>

          <div class="form-group">
            <label for="fromEmail">From Email Address</label>
            <input 
              type="email" 
              id="fromEmail"
              v-model="localSettings.fromEmail" 
              placeholder="noreply@example.com"
              class="form-control"
            />
          </div>

          <div class="form-group">
            <label for="emailFrequency">Email Frequency</label>
            <select id="emailFrequency" v-model="localSettings.emailFrequency" class="form-control">
              <option value="immediate">Immediate</option>
              <option value="hourly">Hourly Digest</option>
              <option value="daily">Daily Digest</option>
              <option value="weekly">Weekly Summary</option>
            </select>
          </div>

          <div class="form-group">
            <div class="checkbox-item">
              <input 
                type="checkbox" 
                id="emailOnNewChat"
                v-model="localSettings.emailOnNewChat"
              />
              <label for="emailOnNewChat">Email on New Chat</label>
            </div>
          </div>

          <div class="form-group">
            <div class="checkbox-item">
              <input 
                type="checkbox" 
                id="emailOnMissedChat"
                v-model="localSettings.emailOnMissedChat"
              />
              <label for="emailOnMissedChat">Email on Missed Chat</label>
            </div>
          </div>

          <div class="form-group">
            <div class="checkbox-item">
              <input 
                type="checkbox" 
                id="emailOnAgentOffline"
                v-model="localSettings.emailOnAgentOffline"
              />
              <label for="emailOnAgentOffline">Email when Agents go Offline</label>
            </div>
          </div>
        </div>
      </div>

      <div class="sound-settings">
        <h3>Sound Settings</h3>
        <div class="form-grid">
          <div class="form-group">
            <label for="soundVolume">Sound Volume</label>
            <input 
              type="range" 
              id="soundVolume"
              v-model.number="localSettings.soundVolume"
              min="0" 
              max="100" 
              step="10"
              class="slider"
            />
            <div class="volume-display">{{ localSettings.soundVolume }}%</div>
          </div>

          <div class="form-group">
            <label for="notificationSound">Notification Sound</label>
            <select id="notificationSound" v-model="localSettings.notificationSound" class="form-control">
              <option value="default">Default</option>
              <option value="chime">Chime</option>
              <option value="bell">Bell</option>
              <option value="pop">Pop</option>
              <option value="whistle">Whistle</option>
            </select>
          </div>

          <div class="form-group">
            <button class="btn btn-secondary" @click="testSound" :disabled="!localSettings.sound">
              <i class="fas fa-play"></i> Test Sound
            </button>
          </div>
        </div>
      </div>

      <div class="notification-timing">
        <h3>Notification Timing</h3>
        <div class="form-grid">
          <div class="form-group">
            <label for="quietHoursStart">Quiet Hours Start</label>
            <input 
              type="time" 
              id="quietHoursStart"
              v-model="localSettings.quietHoursStart" 
              class="form-control"
            />
          </div>

          <div class="form-group">
            <label for="quietHoursEnd">Quiet Hours End</label>
            <input 
              type="time" 
              id="quietHoursEnd"
              v-model="localSettings.quietHoursEnd" 
              class="form-control"
            />
          </div>

          <div class="form-group">
            <div class="checkbox-item">
              <input 
                type="checkbox" 
                id="enableQuietHours"
                v-model="localSettings.enableQuietHours"
              />
              <label for="enableQuietHours">Enable Quiet Hours</label>
            </div>
          </div>

          <div class="form-group">
            <label for="notificationDelay">Notification Delay (seconds)</label>
            <input 
              type="number" 
              id="notificationDelay"
              v-model="localSettings.notificationDelay" 
              placeholder="0"
              min="0"
              max="300"
              class="form-control"
            />
          </div>
        </div>
      </div>
    </div>
    
    <div class="form-actions">
      <button 
        class="btn btn-secondary"
        @click="testNotifications"
        :disabled="saving"
      >
        <i class="fas fa-bell"></i> Test Notifications
      </button>

      <button 
        class="btn btn-primary"
        @click="saveSettings"
        :disabled="saving"
      >
        <i class="fas fa-save"></i>
        <span v-if="saving">Saving...</span>
        <span v-else>Save Notification Settings</span>
      </button>
    </div>
  </div>
</template>

<script>
import { ref, watch } from 'vue'

export default {
  name: 'NotificationSettings',
  props: {
    settings: {
      type: Object,
      required: true
    },
    saving: {
      type: Boolean,
      default: false
    }
  },
  emits: ['save'],
  setup(props, { emit }) {
    const localSettings = ref({
      email: true,
      browser: true,
      sound: false,
      sms: false,
      desktop: true,
      slack: false,
      notificationEmail: 'admin@lightwave.ai',
      fromEmail: 'noreply@lightwave.ai',
      emailFrequency: 'immediate',
      emailOnNewChat: true,
      emailOnMissedChat: true,
      emailOnAgentOffline: false,
      soundVolume: 50,
      notificationSound: 'default',
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
      enableQuietHours: false,
      notificationDelay: 0,
      ...props.settings
    })

    // Watch for prop changes
    watch(() => props.settings, (newSettings) => {
      localSettings.value = { ...localSettings.value, ...newSettings }
    }, { deep: true, immediate: true })

    const saveSettings = () => {
      emit('save', localSettings.value)
    }

    const testSound = () => {
      // Create a simple audio test
      const audio = new Audio()
      audio.src = `/sounds/${localSettings.value.notificationSound}.mp3`
      audio.volume = localSettings.value.soundVolume / 100
      audio.play().catch(() => {
        // Fallback to a simple beep
        const context = new (window.AudioContext || window.webkitAudioContext)()
        const oscillator = context.createOscillator()
        const gain = context.createGain()
        
        oscillator.connect(gain)
        gain.connect(context.destination)
        
        oscillator.frequency.value = 800
        gain.gain.value = localSettings.value.soundVolume / 100 * 0.1
        
        oscillator.start()
        oscillator.stop(context.currentTime + 0.2)
      })
    }

    const testNotifications = () => {
      if (localSettings.value.browser && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('Test Notification', {
            body: 'This is a test notification from Lightwave AI',
            icon: '/favicon.ico'
          })
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              new Notification('Test Notification', {
                body: 'This is a test notification from Lightwave AI',
                icon: '/favicon.ico'
              })
            }
          })
        }
      }
      
      if (localSettings.value.sound) {
        testSound()
      }
    }

    return {
      localSettings,
      saveSettings,
      testSound,
      testNotifications
    }
  }
}
</script>

<style scoped>
.notification-settings {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.settings-header {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #f1f5f9;
}

.settings-header h2 {
  margin: 0 0 8px 0;
  color: #1f2937;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 1.5rem;
  font-weight: 600;
}

.settings-header h2 i {
  color: #3b82f6;
}

.settings-header p {
  margin: 0;
  color: #6b7280;
  font-size: 1rem;
}

.settings-form {
  margin-bottom: 24px;
}

.notification-types, .email-settings, .sound-settings, .notification-timing {
  background: #f8fafc;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  margin-bottom: 20px;
}

.notification-types h3, .email-settings h3, .sound-settings h3, .notification-timing h3 {
  margin: 0 0 16px 0;
  color: #1f2937;
  font-size: 1.2rem;
  font-weight: 600;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 600;
  color: #374151;
  font-size: 0.9rem;
}

.form-control {
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.95rem;
  transition: border-color 0.2s ease;
  background: #ffffff;
}

.form-control:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-direction: row !important;
}

.checkbox-item input[type="checkbox"] {
  width: 18px;
  height: 18px;
  margin: 0;
  accent-color: #3b82f6;
}

.checkbox-item label {
  margin: 0;
  cursor: pointer;
  flex: 1;
}

.slider {
  width: 100%;
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  background: #3b82f6;
  border-radius: 50%;
  cursor: pointer;
  transition: background 0.2s ease;
}

.slider::-webkit-slider-thumb:hover {
  background: #2563eb;
}

.slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  background: #3b82f6;
  border-radius: 50%;
  cursor: pointer;
  border: none;
}

.volume-display {
  text-align: center;
  font-weight: 500;
  color: #374151;
  background: #f8fafc;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.9rem;
}

.form-actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-secondary {
  background: #6b7280;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #4b5563;
  transform: translateY(-1px);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .btn {
    justify-content: center;
  }
}
</style>
