import { getFamily } from '../../utils/family'

export default defineEventHandler(async (event) => {
  return getFamily(event)
})
