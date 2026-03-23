import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { Link } from "react-router";

export function Button({ to, variant = "primary", className = "mt-2 px-8 py-3 rounded-lg font-bold", children, ...props }) {
  if (to) {
    return (
      <Link to={to} className={`btn-${variant} ${className}`} {...props}>
        {children}
      </Link>
    );
  }
  return (
    <button className={`btn-${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Spinner({ message = "불러오는 중...", full = false, className = "" }) {
  if (full) {
    return (
      <div className="bg-black min-h-screen flex items-center justify-center">
        <p className="text-white text-2xl animate-pulse">{message}</p>
      </div>
    );
  }
  return <p className={`text-white text-xl ${className}`}>{message}</p>;
}

export function Modal({ onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
      <div className="relative">
        <Button variant="ghost" onClick={onClose} className="absolute -top-10 right-0 text-2xl">
          <FontAwesomeIcon icon={faXmark} />
        </Button>
        {children}
      </div>
    </div>
  );
}

export function Container({ className = "", children }) {
  return <div className={`container mx-auto ${className}`}>{children}</div>;
}
