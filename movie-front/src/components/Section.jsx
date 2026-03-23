import { Link } from "react-router";
import { Card } from "./Card.jsx";
import { Container } from "./UI.jsx";

export function Section({ title, items, category }) {
  return (
    <section className="bg-black px-11 py-24">
      <Container>
        <div className="flex items-center justify-between pt-10 pb-5 px-3">
          <h2 className="text-4xl text-bold pt-10 pb-5 px-3 text-white">{title}</h2>
          {category && <Link to={`/category/${category}`} className="text-yellow-400">더보기</Link>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {items.map((el) => (
            <Card key={el.id} item={el} />
          ))}
        </div>
      </Container>
    </section>
  );
}
