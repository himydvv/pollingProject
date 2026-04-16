import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <section className="panel panel--warning">
      <p className="eyebrow">404</p>
      <h2>The requested page was not found.</h2>
      <Link className="secondary-button secondary-button--link" to="/">
        Return home
      </Link>
    </section>
  );
}
