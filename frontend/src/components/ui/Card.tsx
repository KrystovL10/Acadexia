import { cn } from '../../lib/utils';

/* ─── Card Root ─── */

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 bg-white shadow-sm',
        className
      )}
    >
      {children}
    </div>
  );
}

/* ─── CardHeader ─── */

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between border-b border-gray-100 px-6 py-4',
        className
      )}
    >
      {children}
    </div>
  );
}

/* ─── CardContent ─── */

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

function CardContent({ children, className }: CardContentProps) {
  return <div className={cn('px-6 py-4', className)}>{children}</div>;
}

/* ─── CardFooter ─── */

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div
      className={cn(
        'flex items-center border-t border-gray-100 px-6 py-3',
        className
      )}
    >
      {children}
    </div>
  );
}

export { Card, CardHeader, CardContent, CardFooter };
export default Card;
