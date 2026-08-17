import { db, currentUser } from '../../utils/store'
import { getFamily } from '../../utils/family'
import { pushSubscriptions, sendPushToFamilyCaregivers } from '../../utils/push'

export default defineEventHandler(async (event) => {
  const { code } = await readBody<{ code: string }>(event)

  const family = await getFamily(event)
  const ok = (code ?? '').trim().toUpperCase() === family.code
  if (ok) {
    // TODO: 寫入 family_members 關聯表，並通知照顧者「有人加入」
    const user = currentUser()
    user.familyCode = family.code
    user.connectedCaregiver = { id: 'u_naijia', name: '陳乃嘉' }
    await pushSubscriptions(event).put(
      `family-member:${family.code}:${user.id}`,
      JSON.stringify({
        userId: user.id,
        name: user.name,
        familyCode: family.code,
        joinedAt: new Date().toISOString(),
      }),
    )
    const push = sendPushToFamilyCaregivers(event, family.code, {
      title: 'Family connected',
      body: `${user.name} joined your Accessity family.`,
      url: '/caregiver',
    }).catch((error) => console.error('Family connection push failed', error))
    const executionContext = event.context.cloudflare?.context
    if (executionContext) executionContext.waitUntil(push)
    else await push
  }

  return { ok, family, connectedCaregiver: ok ? { id: 'u_naijia', name: '陳乃嘉' } : null }
})
