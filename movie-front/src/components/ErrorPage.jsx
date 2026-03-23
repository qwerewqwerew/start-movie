import { Link } from "react-router";

export function ErrorPage() {
  return (
    <div className="bg-black min-h-screen flex flex-col items-center justify-center text-center px-6">
      <h1 className="text-8xl font-bold text-yellow-400">404</h1>
      <p className="text-white text-2xl mt-4">페이지를 찾을 수 없습니다</p>
      <p className="text-gray-400 mt-2">요청하신 페이지가 존재하지 않거나 이동되었습니다.</p>
      <Link to="/" className="mt-8 bg-yellow-400 text-black px-6 py-3 rounded-lg font-bold hover:bg-yellow-300 transition-colors">
        홈으로 돌아가기
      </Link>
    </div>
  );
}
