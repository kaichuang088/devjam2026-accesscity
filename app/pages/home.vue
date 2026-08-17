<script setup lang="ts">
/** 主頁：依角色顯示不同內容 */
const { isCaregiver, user, ensureUser } = useSession()
await ensureUser()

const notificationStatus = ref<'idle' | 'enabled' | 'unsupported' | 'denied' | 'error'>('idle')

function urlBase64ToUint8Array(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0))
}

async function enableNotifications() {
  if (!('serviceWorker' in navigator) || !('Notification' in window)) {
    notificationStatus.value = 'unsupported'
    return
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js')
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      notificationStatus.value = 'denied'
      return
    }

    const { publicKey } = await $fetch<{ publicKey: string }>('/api/push/public-key')
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      }))

    await $fetch('/api/push/subscribe', {
      method: 'POST',
      body: {
        ...subscription.toJSON(),
        role: user.value?.role,
        familyCode: user.value?.familyCode,
      },
    })
    await registration.showNotification('Accessity notifications enabled', {
      body: 'This device can now receive SOS alerts even when the website is closed.',
      icon: '/mimo-icon.png',
    })
    notificationStatus.value = 'enabled'
  } catch (error) {
    console.error('Unable to enable push notifications', error)
    notificationStatus.value = 'error'
  }
}
</script>

<template>
  <div>
    <CaregiverHome v-if="isCaregiver" />
    <RecipientHome v-else :user="user" />

    <div v-if="notificationStatus !== 'enabled'" class="notification-opt-in">
      <UiButton variant="outline" @click="enableNotifications">Enable phone notifications</UiButton>
      <p v-if="notificationStatus === 'unsupported'" class="muted">
        This browser does not support notifications.
      </p>
      <p v-if="notificationStatus === 'denied'" class="muted">
        Notifications are blocked in your phone settings.
      </p>
      <p v-if="notificationStatus === 'error'" class="muted">
        Push setup is incomplete. Please try again after Cloudflare is configured.
      </p>
    </div>
  </div>
</template>

<style scoped>
.notification-opt-in {
  padding: 0 18px 96px;
  text-align: center;
}
</style>
