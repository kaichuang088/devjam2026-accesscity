<script setup lang="ts">
/** 主頁：依角色顯示不同內容 */
const { isCaregiver, user, ensureUser } = useSession()
await ensureUser()

const notificationStatus = ref<'idle' | 'enabled' | 'unsupported' | 'denied'>('idle')

async function enableNotifications() {
  if (!('serviceWorker' in navigator) || !('Notification' in window)) {
    notificationStatus.value = 'unsupported'
    return
  }

  const registration = await navigator.serviceWorker.register('/sw.js')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    notificationStatus.value = 'denied'
    return
  }

  await registration.showNotification('Accessity notifications enabled', {
    body: 'Safety and trip updates can now appear on this phone.',
    icon: '/mimo-icon.png',
  })
  notificationStatus.value = 'enabled'
}
</script>

<template>
  <div>
    <CaregiverHome v-if="isCaregiver" />
    <RecipientHome v-else :user="user" />

    <div v-if="notificationStatus !== 'enabled'" class="notification-opt-in">
      <UiButton variant="outline" @click="enableNotifications">Enable phone notifications</UiButton>
      <p v-if="notificationStatus === 'unsupported'" class="muted">This browser does not support notifications.</p>
      <p v-if="notificationStatus === 'denied'" class="muted">Notifications are blocked in your phone settings.</p>
    </div>
  </div>
</template>

<style scoped>
.notification-opt-in {
  padding: 0 18px 96px;
  text-align: center;
}
</style>
