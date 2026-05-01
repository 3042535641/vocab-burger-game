import { useEffect, useRef, useState } from 'react'
import { impactDurations, type ImpactKind } from '../constants/game'

export const useTimedImpact = () => {
  const [impact, setImpact] = useState<ImpactKind | null>(null)
  const [impactText, setImpactText] = useState('')
  const timerRef = useRef<number | undefined>(undefined)

  const clearImpact = () => {
    window.clearTimeout(timerRef.current)
    timerRef.current = undefined
    setImpact(null)
    setImpactText('')
  }

  const triggerImpact = (kind: ImpactKind, text = '') => {
    window.clearTimeout(timerRef.current)
    setImpact(kind)
    setImpactText(text)
    timerRef.current = window.setTimeout(() => {
      setImpact(null)
      setImpactText('')
      timerRef.current = undefined
    }, impactDurations[kind])
  }

  useEffect(() => clearImpact, [])

  return {
    clearImpact,
    impact,
    impactText,
    triggerImpact,
  }
}
