'use client'

import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useKakaoMap } from '@/lib/hooks/use-kakao-map'

declare global {
  interface Window {
    kakao: any
  }
}

type Props = {
  onLocationSelect: (lat: number, lng: number, address: string) => void
}

export default function KakaoMap({ onLocationSelect }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<any>(null)
  const [marker, setMarker] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const isLoaded = useKakaoMap()

  useEffect(() => {
    if (!isLoaded || !mapRef.current) return

    const center = new window.kakao.maps.LatLng(37.5665, 126.9780)
    const mapInstance = new window.kakao.maps.Map(mapRef.current, {
      center,
      level: 3,
    })
    const markerInstance = new window.kakao.maps.Marker({ position: center })
    markerInstance.setMap(mapInstance)

    setMap(mapInstance)
    setMarker(markerInstance)

    window.kakao.maps.event.addListener(mapInstance, 'click', (mouseEvent: any) => {
      const latlng = mouseEvent.latLng
      markerInstance.setPosition(latlng)

      const geocoder = new window.kakao.maps.services.Geocoder()
      geocoder.coord2Address(
        latlng.getLng(),
        latlng.getLat(),
        (result: any, status: any) => {
          if (status === window.kakao.maps.services.Status.OK) {
            const addr = result[0].road_address?.address_name
              ?? result[0].address.address_name
            onLocationSelect(latlng.getLat(), latlng.getLng(), addr)
          }
        }
      )
    })
  }, [isLoaded, onLocationSelect])

  function handleSearch() {
    if (!map || !searchQuery.trim()) return

    const ps = new window.kakao.maps.services.Places()
    ps.keywordSearch(searchQuery, (data: any, status: any) => {
      if (status === window.kakao.maps.services.Status.OK && data.length > 0) {
        const place = data[0]
        const position = new window.kakao.maps.LatLng(place.y, place.x)
        map.setCenter(position)
        marker?.setPosition(position)
        onLocationSelect(parseFloat(place.y), parseFloat(place.x), place.address_name)
      }
    })
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="주소 또는 건물명 검색"
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
        />
        <Button type="button" variant="outline" onClick={handleSearch}>
          검색
        </Button>
      </div>
      <div ref={mapRef} className="w-full h-64 rounded-lg border bg-gray-100">
        {!isLoaded && (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            지도 로딩 중...
          </div>
        )}
      </div>
    </div>
  )
}
