import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">페이지를 찾을 수 없습니다</h2>
        <p className="text-muted-foreground mb-4">
          투표방 링크가 올바른지 확인해주세요
        </p>
        <Link href="/">
          <Button>홈으로 돌아가기</Button>
        </Link>
      </div>
    </main>
  )
}
