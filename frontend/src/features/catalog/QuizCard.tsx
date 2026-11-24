import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { QuizView } from '@/types/quiz';
import { formatPartName, isListeningPart } from '@/lib/utils';
import { BookOpen, Clock, ArrowRight, Sparkles, Headphones, FileText } from 'lucide-react';

interface QuizCardProps {
  quiz: QuizView;
  onStartPractice?: (quizId: string) => void;
  isStarting?: boolean;
}

export function QuizCard({ quiz, onStartPractice, isStarting = false }: QuizCardProps) {
  const isListening = isListeningPart(quiz.part);

  return (
    <Card className="flex flex-col justify-between border-slate-200/90 hover:border-primary/50 transition-all hover:shadow-elevation group bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <Badge variant={isListening ? 'outline' : 'secondary'} className="gap-1 font-medium text-xs">
            {isListening ? <Headphones className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
            Part {quiz.part}
          </Badge>
          {quiz.premium ? (
            <Badge variant="pro" className="flex items-center gap-1">
              <Sparkles className="h-2.5 w-2.5" /> PRO
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-slate-600">
              FREE
            </Badge>
          )}
        </div>

        <CardTitle className="text-base font-bold text-slate-900 group-hover:text-primary transition-colors line-clamp-2">
          {quiz.title}
        </CardTitle>
        <p className="text-xs text-slate-500 pt-1 line-clamp-1">
          {formatPartName(quiz.part)}
        </p>
      </CardHeader>

      <CardContent className="space-y-2.5 pt-0">
        <div className="flex items-center justify-between text-xs text-slate-600 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
          <div className="flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5 text-primary" />
            <span className="font-semibold text-slate-800">{quiz.count} câu hỏi</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500">
            <Clock className="h-3.5 w-3.5" />
            <span>~{Math.round(quiz.count * 1.2)} phút</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-2 flex items-center gap-2">
        <Link to={`/quizzes/${quiz.id}`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full text-xs font-semibold">
            Chi tiết đề
          </Button>
        </Link>
        {onStartPractice ? (
          <Button
            variant="primary"
            size="sm"
            className="flex-1 text-xs font-semibold gap-1"
            onClick={() => onStartPractice(quiz.id)}
            isLoading={isStarting}
          >
            Luyện ngay <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Link to={`/quizzes/${quiz.id}`} className="flex-1">
            <Button variant="primary" size="sm" className="w-full text-xs font-semibold gap-1">
              Luyện ngay <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}
