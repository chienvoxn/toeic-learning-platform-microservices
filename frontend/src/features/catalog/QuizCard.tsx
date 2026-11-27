import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/atoms/Card';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { QuizView } from '@/types/quiz';
import { formatPartName, isListeningPart } from '@/lib/utils';
import { BookOpen, Clock, ArrowRight, Headphones, FileText } from 'lucide-react';

interface QuizCardProps {
  quiz: QuizView;
  onStartPractice?: (quizId: string) => void;
  isStarting?: boolean;
}

export function QuizCard({ quiz, onStartPractice, isStarting = false }: QuizCardProps) {
  const isListening = isListeningPart(quiz.part);

  return (
    <Card
      variant="default"
      className="flex flex-col justify-between transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal motion-reduce:transition-none motion-reduce:transform-none group"
    >
      <CardHeader className="pb-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Badge variant={isListening ? 'secondary' : 'outline'} className="gap-1.5 font-mono text-xs">
            {isListening ? <Headphones className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
            Part {quiz.part} · {isListening ? 'Listening' : 'Reading'}
          </Badge>
          {quiz.premium ? (
            <Badge variant="pro">PRO</Badge>
          ) : (
            <Badge variant="outline" className="font-mono">
              FREE
            </Badge>
          )}
        </div>

        <div>
          <CardTitle className="text-base sm:text-lg font-extrabold text-foreground line-clamp-2 group-hover:underline decoration-2 underline-offset-4">
            {quiz.title}
          </CardTitle>
          <p className="text-xs text-ink-muted font-medium pt-1.5 line-clamp-1">
            {formatPartName(quiz.part)}
          </p>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-xs text-foreground p-3 rounded-sm bg-background border border-border">
          <div className="flex items-center gap-1.5 font-mono font-bold">
            <BookOpen className="h-3.5 w-3.5 shrink-0" />
            <span>{quiz.count} câu</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-ink-muted font-semibold">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>~{Math.round(quiz.count * 1.2)} phút</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-2 flex items-center gap-2.5">
        <Link to={`/quizzes/${quiz.id}`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full">
            Chi tiết đề
          </Button>
        </Link>
        {onStartPractice ? (
          <Button
            variant="primary"
            size="sm"
            className="flex-1 gap-1"
            onClick={() => onStartPractice(quiz.id)}
            isLoading={isStarting}
          >
            Luyện ngay <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Link to={`/quizzes/${quiz.id}`} className="flex-1">
            <Button variant="primary" size="sm" className="w-full gap-1">
              Luyện ngay <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}
