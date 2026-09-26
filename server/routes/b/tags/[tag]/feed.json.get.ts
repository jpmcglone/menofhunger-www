/** Per-tag Board feed — GET /b/tags/:tag/feed.json */
import { defineBoardFeedHandler } from '../../../../utils/board-feed'

export default defineBoardFeedHandler('json', { perTag: true })
