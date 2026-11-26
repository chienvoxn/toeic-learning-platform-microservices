import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';

export function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white text-slate-600 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-white">
                <GraduationCap className="h-5 w-5" />
              </div>
              <span className="font-bold text-base text-slate-900">TOEIC Master</span>
            </div>
            <p className="text-slate-500 leading-relaxed">
              Nền tảng luyện thi TOEIC chuẩn format quốc tế ETS. Tối ưu hóa điểm số thông qua phân tích kết quả tức thì và đề thi đa dạng.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-3 uppercase tracking-wider text-[11px]">Nội Dung Học Tập</h4>
            <ul className="space-y-2">
              <li><Link to="/quizzes?part=1" className="hover:text-primary transition-colors">Part 1: Photographs</Link></li>
              <li><Link to="/quizzes?part=2" className="hover:text-primary transition-colors">Part 2: Question & Response</Link></li>
              <li><Link to="/quizzes?part=5" className="hover:text-primary transition-colors">Part 5: Incomplete Sentences</Link></li>
              <li><Link to="/quizzes?part=7" className="hover:text-primary transition-colors">Part 7: Reading Comprehension</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-3 uppercase tracking-wider text-[11px]">Dịch Vụ & Hội Viên</h4>
            <ul className="space-y-2">
              <li><Link to="/pricing" className="hover:text-primary transition-colors">Bảng Giá Gói PRO</Link></li>
              <li><Link to="/login" className="hover:text-primary transition-colors">Đăng Nhập Tài Khoản</Link></li>
              <li><Link to="/register" className="hover:text-primary transition-colors">Đăng Ký Thành Viên</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-3 uppercase tracking-wider text-[11px]">Cam Kết Chất Lượng</h4>
            <p className="text-slate-500 leading-relaxed mb-3">
              Đáp ứng đầy đủ 5 bounded contexts và tiêu chuẩn vi dịch vụ chuẩn mực.
            </p>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-semibold text-[10px]">
              ETS Format 2026 Ready
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-400">
          <p>© 2026 TOEIC Master Platform. Tất cả các quyền được bảo lưu.</p>
          <div className="flex gap-6">
            <span>Bảo mật dữ liệu</span>
            <span>Điều khoản dịch vụ</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
