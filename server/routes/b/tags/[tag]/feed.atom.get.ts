/** Per-tag Board feed — GET /b/tags/:tag/feed.atom */
import { defineBoardFeedHandler } from '../../../../utils/board-feed'

export default defineBoardFeedHandler('atom', { perTag: true })
