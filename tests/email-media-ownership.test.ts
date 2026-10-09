import { describe, expect, it } from 'vitest'
import type { AdminImageReviewListItem } from '../types/api'
import { describeMediaItem, mediaOwnerLink } from '../utils/media-review'

describe('email media ownership', () => {
  it('protects retained email images without inventing an admin destination', () => {
    const item: AdminImageReviewListItem = {
      id: 'image', r2Key: 'email/image.png', kind: 'image',
      lastModified: '2026-10-09T00:00:00Z', publicUrl: null, deletedAt: null,
      belongsToSummary: 'email_delivery', postId: null, authorUsername: null,
      userId: null, profileUsername: null,
    }
    expect(describeMediaItem(item).protectedMedia).toBe(true)
    expect(describeMediaItem(item).label).toBe('Email')
    expect(mediaOwnerLink(item)).toBeNull()
    expect(describeMediaItem({ ...item, belongsToSummary: 'orphan' }).protectedMedia).toBe(false)
  })
})
