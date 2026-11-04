import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found">
      <div className="not-found-inner">
        <span className="not-found-brand">Tape</span>
        <p className="not-found-code">404</p>
        <h1>页面不存在</h1>
        <Link className="primary-button" href="/">
          返回自选
        </Link>
      </div>
    </main>
  );
}
