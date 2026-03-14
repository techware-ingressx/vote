'use client'

import { useEffect, useState } from 'react'

const KAKAO_SDK_URL = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_JS_KEY}&autoload=false&libraries=services`

let loadPromise: Promise<void> | null = null

function loadKakaoSDK(): Promise<void> {
  if (loadPromise) return loadPromise

  if (typeof window !== 'undefined' && window.kakao?.maps) {
    return Promise.resolve()
  }

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = KAKAO_SDK_URL
    script.onload = () => {
      window.kakao.maps.load(() => resolve())
    }
    script.onerror = () => {
      loadPromise = null
      reject(new Error('카카오맵 SDK 로드 실패'))
    }
    document.head.appendChild(script)
  })

  return loadPromise
}

export function useKakaoMap() {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    loadKakaoSDK()
      .then(() => setIsLoaded(true))
      .catch((err) => console.error(err))
  }, [])

  return isLoaded
}
