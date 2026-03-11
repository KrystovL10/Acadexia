import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '../../lib/utils';

/* ─── Tabs Root ─── */

interface TabsProps {
  defaultValue: string;
  children: React.ReactNode;
  className?: string;
  onValueChange?: (value: string) => void;
}

function Tabs({ defaultValue, children, className, onValueChange }: TabsProps) {
  return (
    <TabsPrimitive.Root
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      className={className}
    >
      {children}
    </TabsPrimitive.Root>
  );
}

/* ─── TabsList ─── */

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

function TabsList({ children, className }: TabsListProps) {
  return (
    <TabsPrimitive.List
      className={cn(
        'inline-flex items-center gap-1 rounded-lg bg-gray-100 p-1',
        className
      )}
    >
      {children}
    </TabsPrimitive.List>
  );
}

/* ─── TabsTrigger ─── */

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

function TabsTrigger({ value, children, className }: TabsTriggerProps) {
  return (
    <TabsPrimitive.Trigger
      value={value}
      className={cn(
        'inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 transition-all',
        'hover:text-gray-900',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
        'data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm',
        className
      )}
    >
      {children}
    </TabsPrimitive.Trigger>
  );
}

/* ─── TabsContent ─── */

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

function TabsContent({ value, children, className }: TabsContentProps) {
  return (
    <TabsPrimitive.Content
      value={value}
      className={cn('mt-4 focus-visible:outline-none', className)}
    >
      {children}
    </TabsPrimitive.Content>
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
export default Tabs;
