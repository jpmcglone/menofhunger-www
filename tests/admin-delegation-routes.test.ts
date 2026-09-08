import { useNuxtApp } from '#app'
import { describe, expect, it } from 'vitest'

describe('delegated admin routes', () => {
  it.each([
    ['/admin/delegation', 'admin-delegation'],
    ['/admin/delegation/5f2bff0f-ccda-4a7b-b761-ae1ecdf91b48', 'admin-delegation-id'],
  ])('resolves %s in the actual application router', (path, name) => {
    const route = useNuxtApp().$router.resolve(path)
    expect(route.name).toBe(name)
    expect(route.matched.length).toBeGreaterThan(0)
    expect(route.meta.middleware).toContain('admin')
  })
})
