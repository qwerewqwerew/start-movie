import { Link } from "react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeart } from "@fortawesome/free-solid-svg-icons";
export function Card({ item }) {
  const poster = `https://image.tmdb.org/t/p/w500/${item.poster_path}`;
  return (
    <div className="card py-10 group">
      <Link to={`/movie/${item.id}`}>
        <div className="aspect-[2/3] relative overflow-hidden rounded-md">
          <img className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-110" src={poster} alt={item.title} />
             <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
            <p className="text-white text-sm line-clamp-3">{item.overview}</p>
            <div className="flex items-center gap-1 mt-2 text-yellow-400">
              <FontAwesomeIcon icon={faStar} className="text-xs" />
              <span className="text-sm font-bold">{(item.vote_average || 0).toFixed(1)}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col px-1">
          <h4 className="text-white text-xl text-bold truncate">{item.original_title || item.name}</h4>
          <span className="flex items-center gap-2 font-bold text-yellow-500">
            <FontAwesomeIcon icon={faHeart} />
            <span>{item.vote_average}</span>
            <span className="font-medium">{item.release_date}</span>
          </span>
        </div>
      </Link>
    </div>
  );
}
