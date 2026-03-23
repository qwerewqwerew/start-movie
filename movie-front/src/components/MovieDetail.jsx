import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faPlay } from "@fortawesome/free-solid-svg-icons";
import api from "../api/axios";
import { Spinner, Container, Modal, Button } from "./UI.jsx";

export function MovieDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTrailer, setShowTrailer] = useState(false);

  useEffect(() => {
    api
      .get(`movie/${id}`, {
        params: { append_to_response: "videos" },
      })
      .then((res) => {
        setMovie(res.data);
        setLoading(false);
      })
      .catch(() => {
        setMovie(null);
        setLoading(false);
      });
  }, [id]);
  if (loading) return <Spinner full />;
  if (!movie) {
    return (
      <div className="bg-black min-h-screen flex items-center justify-center">
        <p className="text-red-400 text-2xl">영화 정보를 불러오지 못했습니다.</p>
      </div>
    );
  }
  const poster = `https://image.tmdb.org/t/p/w500/${movie.poster_path}`;
  const videoList = movie.videos ? movie.videos.results : [];
  const trailer = videoList.find((v) => v.type === "Trailer" && v.site === "YouTube");
  const genres = movie.genres || [];

  return (
    <div className="bg-black min-h-screen relative">
      <div className="relative pt-24 pb-16">
        <Container>
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 inline-flex items-center gap-2">
            <FontAwesomeIcon icon={faArrowLeft} />
            <span>뒤로가기</span>
          </Button>
          <div className="flex flex-col md:flex-row gap-10">
            <img src={poster} alt={movie.title} className="w-full md:w-72 rounded-lg object-cover shadow-2xl" />
            <div className="flex flex-col gap-4 text-white">
              <h1 className="text-4xl font-bold text-yellow-400">{movie.title}</h1>
              <p className="text-gray-400 text-lg">{movie.original_title}</p>

              <div className="flex gap-4 text-sm text-gray-300">
                <span>개봉일: {movie.release_date || "미정"}</span>
                <span>러닝타임: {movie.runtime || 0}분</span>
              </div>

              <div className="flex gap-2 flex-wrap">
                {genres.map((genre) => (
                  <span key={genre.id} className="bg-yellow-400 text-black px-3 py-1 rounded-full text-sm font-bold">
                    {genre.name}
                  </span>
                ))}
              </div>

              <p className="text-gray-300 leading-relaxed max-w-xl">{movie.overview || "줄거리 정보가 없습니다."}</p>
              {trailer && (
                <Button variant="danger" onClick={() => setShowTrailer(true)} className="mt-2 px-6 py-3 rounded-lg inline-flex items-center gap-2 w-fit transition-colors">
                  <FontAwesomeIcon icon={faPlay} />
                  예고편 보기
                </Button>
              )}
            </div>
          </div>
        </Container>
        {showTrailer && trailer && (
          <Modal onClose={() => setShowTrailer(false)}>
            <div className="w-full max-w-4xl aspect-video">
              <iframe className="w-full h-full rounded-lg" src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1`} title="Trailer" allow="autoplay; encrypted-media" allowFullScreen />
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}
