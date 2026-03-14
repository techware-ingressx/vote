import CreateRoomForm from '@/components/create-room-form'

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-orange-50 to-white">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">오늘 뭐 먹지?</h1>
          <p className="text-muted-foreground">
            AI 셰프가 추천하고, 팀이 투표로 결정!
          </p>
        </div>
        <CreateRoomForm />
      </div>
    </main>
  )
}
