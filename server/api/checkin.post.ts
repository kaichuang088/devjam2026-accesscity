import { db, nowHHMM } from '../utils/store'
import { sendPushToFamilyCaregivers } from '../utils/push'

/**
 * Care Agent 的 Check-in：Detect → Ask → Wait → Escalate（企劃書 §4.7）
 *   ok           使用者說沒事   → 只留紀錄，不打擾照顧者
 *   need-help    使用者要幫忙   → 立刻升級為 Care Alert
 *   no-response  等待逾時未回覆 → 同樣升級為 Care Alert（來源標成「未回覆」）
 */
export default defineEventHandler(async (event) => {
  const { answer, familyCode } = await readBody<{
    answer: 'ok' | 'need-help' | 'no-response'
    familyCode?: string
  }>(event)

  db.checkins.push({ id: `c_${Date.now()}`, answer, createdAt: new Date().toISOString() })

  const titleByAnswer = {
    ok: 'Check-in: I am OK',
    'need-help': 'Check-in: Needs help',
    'no-response': 'Check-in: No response',
  } as const

  db.trip.events.push({
    id: `e_${Date.now()}`,
    time: nowHHMM(),
    title: titleByAnswer[answer] ?? 'Check-in',
    detail:
      answer === 'ok'
        ? '使用者回覆沒事'
        : answer === 'need-help'
          ? '使用者要求協助，已通知照顧者'
          : '詢問後未回覆，已升級通知照顧者',
    kind: 'checkin',
  })

  if (answer !== 'ok') {
    const escalated = answer === 'no-response'
    db.alerts.unshift({
      id: `al_${Date.now()}`,
      kind: 'safety-check',
      memberId: 'm_kai',
      memberName: 'Kai',
      title: 'Safety Alert',
      message: escalated
        ? 'Kai has not responded to the safety check.'
        : 'Kai asked for help during a safety check.',
      sourceLabel: escalated ? 'Automatic Safety Alert' : 'Self Check-in',
      location: db.trip.currentLocation,
      time: `${nowHHMM()} · just now`,
      lastMovement: 'just now',
      acknowledged: false,
    })

    const latestAlert = db.alerts[0]!
    const push = sendPushToFamilyCaregivers(event, familyCode, {
      title: latestAlert.title,
      body: latestAlert.message,
      url: '/caregiver/alerts',
    }).catch((error) => console.error('Check-in push failed', error))
    const executionContext = event.context.cloudflare?.context
    if (executionContext) executionContext.waitUntil(push)
    else await push
  }

  return { ok: true, escalated: answer !== 'ok' }
})
