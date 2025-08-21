import { EffectCallback, useEffect } from 'react'

function useMountEffect(effectFn: EffectCallback) {
  // We excplicitly ignore the dependency array here because we want the effect to run only once
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useEffect(effectFn, [])
}

export default useMountEffect
