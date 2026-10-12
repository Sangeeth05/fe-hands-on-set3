import { act, renderHook } from '@testing-library/react'
import { usePageVisible } from './usePageVisible'

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: state })
  document.dispatchEvent(new Event('visibilitychange'))
}

afterEach(() => {
  setVisibility('visible')
})

describe('usePageVisible', () => {
  it('follows the tab visibility so polling can pause and resume', () => {
    const { result } = renderHook(() => usePageVisible())
    expect(result.current).toBe(true)

    act(() => setVisibility('hidden'))
    expect(result.current).toBe(false)

    act(() => setVisibility('visible'))
    expect(result.current).toBe(true)
  })
})
