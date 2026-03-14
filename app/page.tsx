import CreateRoomForm from '@/components/create-room-form'

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      <div className="w-full max-w-lg">
        <div className="text-center mb-10">
          <div className="text-5xl mb-3 animate-bounce">
            🍽️
          </div>
          <h1 className="text-4xl font-extrabold mb-3 bg-gradient-to-r from-orange-600 via-amber-500 to-orange-600 bg-clip-text text-transparent">
            오늘 뭐 먹지?
          </h1>
          <p className="text-lg text-amber-700/70 font-medium">
            🧑‍🍳 AI 셰프가 추천하고, 팀이 투표로 결정!
          </p>
          <div className="mt-2 text-sm text-amber-600/50">
            🍜 🍕 🍣 🥗 🍔 🌮 🍝 🥘
          </div>
        </div>
        <CreateRoomForm />
      </div>
    </main>
  )
}
