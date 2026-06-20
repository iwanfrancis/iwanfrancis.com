import { type EffectCallback, useEffect } from 'react'

function useMountEffect(effectFn: EffectCallback) {
  // We explicitly ignore the dependency array here because we want the effect to run only once
  // biome-ignore lint/correctness/useExhaustiveDependencies: run only on mount
  return useEffect(effectFn, [])
}

export default useMountEffect
