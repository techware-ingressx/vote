'use client'

import { useEffect, useRef } from 'react'
import type { Recommendation } from '@/lib/types'
import { useKakaoMap } from '@/lib/hooks/use-kakao-map'

declare global {
  interface Window {
    kakao: any
  }
}

type Props = {
  centerLat: number
  centerLng: number
  recommendations: Recommendation[]
  selectedId?: string
}

export default function KakaoMapViewer({ centerLat, centerLng, recommendations, selectedId }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const isLoaded = useKakaoMap()

  useEffect(() => {
    if (!isLoaded || !mapRef.current) return

    const center = new window.kakao.maps.LatLng(centerLat, centerLng)
    const map = new window.kakao.maps.Map(mapRef.current, {
      center,
      level: 4,
    })

    new window.kakao.maps.Marker({
      map,
      position: center,
      title: '회사',
    })

    recommendations.forEach((rec) => {
      if (!rec.latitude || !rec.longitude) return

      const position = new window.kakao.maps.LatLng(rec.latitude, rec.longitude)
      const isSelected = rec.id === selectedId

      const marker = new window.kakao.maps.Marker({
        map,
        position,
        title: rec.place_name,
      })

      const infowindow = new window.kakao.maps.InfoWindow({
        content: `<div style="padding:4px 8px;font-size:13px;font-weight:${isSelected ? 'bold' : 'normal'}">${rec.place_name}</div>`,
      })

      if (isSelected) {
        infowindow.open(map, marker)
      }

      window.kakao.maps.event.addListener(marker, 'mouseover', () => {
        infowindow.open(map, marker)
      })
      window.kakao.maps.event.addListener(marker, 'mouseout', () => {
        if (!isSelected) infowindow.close()
      })
    })
  }, [isLoaded, centerLat, centerLng, recommendations, selectedId])

  return <div ref={mapRef} className="w-full h-80 rounded-lg border bg-gray-100" />
}
