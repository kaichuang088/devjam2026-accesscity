import type { CareAlert } from '#shared/types/accessity'
import { db, nowHHMM } from '../../utils/store'
import { sendPushToAll } from '../../utils/push'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ lat?: number; lng?: number }>(event).catch(
    () => ({}) as { lat?: number; lng?: number },
  )

  // TODO: 立即推播給所有已連結的照顧者（FCM / APNs），並寫入事件紀錄
  const alert: CareAlert = {
    id: `al_${Date.now()}`,
    kind: 'emergency',
    memberId: 'm_kai',
    memberName: 'Kai',
    title: 'Emergency Alert',
    message: 'Kai has requested immediate assistance.',
    sourceLabel: 'Manual SOS',
    location: body?.lat ? `${body.lat}, ${body.lng}` : 'Main St. near 4th Ave',
    time: `${nowHHMM()} · just now`,
    lastMovement: 'just now',
    acknowledged: false,
  }

  db.alerts.unshift(alert)

  const push = sendPushToAll(event, {
    title: 'Emergency Alert',
    body: `${alert.memberName} has requested immediate assistance.`,
    url: '/caregiver/alerts',
  }).catch((error) => console.error('SOS push failed', error))
  const executionContext = event.context.cloudflare?.context
  if (executionContext) executionContext.waitUntil(push)
  else await push

  return alert
})
