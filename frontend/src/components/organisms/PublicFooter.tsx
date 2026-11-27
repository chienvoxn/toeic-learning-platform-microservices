import { Link } from 'react-router-dom';

export function PublicFooter() {
  return (
    <footer className="border-t-2 border-border bg-surface text-foreground text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-5 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-sm border-[1.5px] border-border bg-primary text-foreground flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                  <path d="M4 5.5H20V9H13.75V19H10.25V9H4V5.5Z" fill="currentColor" />
                  <rect x="16.5" y="13" width="3.5" height="6" fill="currentColor" />
                </svg>
              </div>
              <span className="font-black text-base text-foreground tracking-tight">TOEIC Master</span>
            </div>
            <p className="text-sm text-ink-muted leading-relaxed max-w-md">
              Nền tảng luyện thi TOEIC theo chuẩn cấu trúc Listening (Part 1–4) và Reading (Part 5–7), hỗ trợ chấm điểm tự động và giải thích chi tiết sau khi nộp bài.
            </p>
          </div>

          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Cấu trúc đề thi
            </h4>
            <ul className="space-y-2 text-sm text-ink-muted">
              <li>
                <Link to="/quizzes?part=1" className="hover:text-foreground hover:underline decoration-2 underline-offset-4">
                  Part 1: Photographs
                </Link>
              </li>
              <li>
                <Link to="/quizzes?part=2" className="hover:text-foreground hover:underline decoration-2 underline-offset-4">
                  Part 2: Question &amp; Response
                </Link>
              </li>
              <li>
                <Link to="/quizzes?part=5" className="hover:text-foreground hover:underline decoration-2 underline-offset-4">
                  Part 5: Incomplete Sentences
                </Link>
              </li>
              <li>
                <Link to="/quizzes?part=7" className="hover:text-foreground hover:underline decoration-2 underline-offset-4">
                  Part 7: Reading Comprehension
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Tài khoản
            </h4>
            <ul className="space-y-2 text-sm text-ink-muted">
              <li>
                <Link to="/pricing" className="hover:text-foreground hover:underline decoration-2 underline-offset-4">
                  Gói hội viên
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-foreground hover:underline decoration-2 underline-offset-4">
                  Đăng nhập
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-foreground hover:underline decoration-2 underline-offset-4">
                  Đăng ký
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Hỗ trợ học viên
            </h4>
            <ul className="space-y-2 text-sm text-ink-muted">
              <li>
                <Link to="/pricing" className="hover:text-foreground hover:underline decoration-2 underline-offset-4">
                  Hạn ngạch &amp; gói học
                </Link>
              </li>
              <li>
                <Link to="/quizzes?skill=listening" className="hover:text-foreground hover:underline decoration-2 underline-offset-4">
                  Luyện Listening (1–4)
                </Link>
              </li>
              <li>
                <Link to="/quizzes?skill=reading" className="hover:text-foreground hover:underline decoration-2 underline-offset-4">
                  Luyện Reading (5–7)
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ink-muted">
          <p>© 2026 TOEIC Master. Nền tảng luyện thi chuẩn cấu trúc ETS.</p>
          <div className="flex gap-6 font-medium">
            <span>Học tập &amp; Đánh giá</span>
            <span>ETS Format · 7 Parts</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
