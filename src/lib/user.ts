const KEY = 'roamer_user_id'

export function getUserId(): string {
  if (typeof window === 'undefined') return 'server'
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(KEY, id)
  }
  return id
}
