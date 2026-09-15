/** Serializable page data keeps the layout rail independent of page mount order. */
export function useExploreRail() {
  const content = useState<{ topics: Array<{ value: string; label: string }>; categories: boolean }>(
    'explore-rail-content', () => ({ topics: [], categories: false }),
  )
  const interestsRequest = useState('explore-rail-interests-request', () => 0)
  function requestInterests() { interestsRequest.value += 1 }
  return { content, interestsRequest, requestInterests }
}
