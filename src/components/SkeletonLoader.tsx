'use client';

type SkeletonVariant = 'discover' | 'matches' | 'likes' | 'profile' | 'conversation';

interface SkeletonLoaderProps {
  variant: SkeletonVariant;
}

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`skeleton ${className}`} />;
}

function DiscoverSkeleton() {
  return (
    <div className="px-4 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <SkeletonBlock className="h-8 w-32 rounded-lg" />
        <div className="flex items-center gap-3">
          <SkeletonBlock className="h-10 w-16 rounded-full" />
          <SkeletonBlock className="h-10 w-10 rounded-full" />
          <SkeletonBlock className="h-10 w-10 rounded-full" />
        </div>
      </div>
      {/* Card */}
      <div className="relative w-full rounded-3xl overflow-hidden" style={{ height: 'calc(100dvh - 200px)' }}>
        <SkeletonBlock className="w-full h-full !rounded-3xl" />
        {/* Fake bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <SkeletonBlock className="h-5 w-24 rounded-full mb-3" />
          <SkeletonBlock className="h-8 w-48 rounded-lg mb-2" />
          <SkeletonBlock className="h-4 w-32 rounded-lg mb-4" />
          <div className="flex gap-2 mb-5">
            <SkeletonBlock className="h-7 w-16 rounded-full" />
            <SkeletonBlock className="h-7 w-20 rounded-full" />
            <SkeletonBlock className="h-7 w-14 rounded-full" />
          </div>
          <div className="flex items-center justify-center gap-5">
            <SkeletonBlock className="w-16 h-16 !rounded-full" />
            <SkeletonBlock className="w-14 h-14 !rounded-full" />
            <SkeletonBlock className="w-16 h-16 !rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

function MatchesSkeleton() {
  return (
    <div className="pt-4">
      <SkeletonBlock className="h-4 w-32 rounded-lg mb-4 mx-4" />
      <div className="flex gap-4 px-4 mb-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <SkeletonBlock className="w-[68px] h-[68px] !rounded-full" />
            <SkeletonBlock className="h-3 w-12 rounded" />
          </div>
        ))}
      </div>
      <div className="border-t border-[#262628] my-2 mx-4" />
      <SkeletonBlock className="h-4 w-24 rounded-lg mb-3 mx-4" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 mx-4">
          <SkeletonBlock className="w-12 h-12 !rounded-full shrink-0" />
          <div className="flex-1">
            <SkeletonBlock className="h-4 w-28 rounded mb-2" />
            <SkeletonBlock className="h-3 w-44 rounded" />
          </div>
          <SkeletonBlock className="h-3 w-10 rounded" />
        </div>
      ))}
    </div>
  );
}

function LikesSkeleton() {
  return (
    <div className="px-4 pt-4">
      <SkeletonBlock className="h-8 w-24 rounded-lg mb-5" />
      <SkeletonBlock className="h-20 w-full !rounded-2xl mb-5" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonBlock key={i} className="aspect-[3/4] w-full !rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div>
      <SkeletonBlock className="w-full aspect-[3/4] max-h-[55dvh] !rounded-none" />
      <div className="px-5 -mt-8 relative z-10">
        <SkeletonBlock className="h-9 w-48 rounded-lg mb-4" />
        <div className="flex gap-3 mb-5">
          <SkeletonBlock className="h-5 w-24 rounded" />
          <SkeletonBlock className="h-5 w-28 rounded" />
          <SkeletonBlock className="h-5 w-20 rounded" />
        </div>
        <SkeletonBlock className="h-20 w-full !rounded-2xl mb-5" />
        <div className="flex flex-wrap gap-2 mb-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-8 w-20 rounded-full" />
          ))}
        </div>
        <SkeletonBlock className="h-32 w-full !rounded-2xl mb-5" />
        <SkeletonBlock className="h-20 w-full !rounded-2xl" />
      </div>
    </div>
  );
}

function ConversationSkeleton() {
  return (
    <div className="flex flex-col h-dvh bg-[#0C0C0E]">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#262628]">
        <SkeletonBlock className="w-9 h-9 !rounded-full" />
        <SkeletonBlock className="w-9 h-9 !rounded-full" />
        <div className="flex-1">
          <SkeletonBlock className="h-4 w-24 rounded mb-1" />
          <SkeletonBlock className="h-3 w-14 rounded" />
        </div>
      </div>
      <div className="flex-1 px-3 py-3 flex flex-col justify-end gap-2">
        <div className="flex justify-end"><SkeletonBlock className="h-10 w-48 !rounded-2xl" /></div>
        <div className="flex justify-start"><SkeletonBlock className="h-10 w-40 !rounded-2xl" /></div>
        <div className="flex justify-end"><SkeletonBlock className="h-10 w-56 !rounded-2xl" /></div>
        <div className="flex justify-start"><SkeletonBlock className="h-10 w-36 !rounded-2xl" /></div>
        <div className="flex justify-end"><SkeletonBlock className="h-10 w-44 !rounded-2xl" /></div>
      </div>
      <div className="px-3 py-2 border-t border-[#262628]">
        <SkeletonBlock className="h-11 w-full !rounded-full" />
      </div>
    </div>
  );
}

const variants: Record<SkeletonVariant, () => React.ReactNode> = {
  discover: DiscoverSkeleton,
  matches: MatchesSkeleton,
  likes: LikesSkeleton,
  profile: ProfileSkeleton,
  conversation: ConversationSkeleton,
};

export default function SkeletonLoader({ variant }: SkeletonLoaderProps) {
  const Skeleton = variants[variant];
  return <Skeleton />;
}
