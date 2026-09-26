/** Per-tag Board feed — GET /b/tags/:tag/feed.xml */
import { defineBoardFeedHandler } from '../../../../utils/board-feed'

export default defineBoardFeedHandler('rss', { perTag: true })
