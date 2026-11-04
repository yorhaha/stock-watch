import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found">
      <div className="not-found-inner">
        <span className="not-found-brand">Tape</span>
        <p className="not-found-code">404</p>
        <h1>这一页没有行情</h1>
        <p>地址可能已经变化，回到自选继续看盘。</p>
        <Link className="primary-button" href="/">
          回到自选
        </Link>
      </div>
    </main>
  );
}
