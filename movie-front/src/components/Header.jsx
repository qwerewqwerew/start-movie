import { Link } from "react-router";
import { Container } from "./UI";

export function Header() {
  return (
    <header className="fixed w-full top-0 left-0 z-50 bg-black/95">
      <Container className="flex items-center justify-between py-4">
        <Link to="/">
          <span className="text-2xl font-bold text-yellow-400">GOFLEX</span>
        </Link>
      </Container>
    </header>
  );
}
