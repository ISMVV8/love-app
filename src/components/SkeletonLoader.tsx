'use client';

type SkeletonVariant = 'discover' | 'matches' | 'likes' | 'profile' | 'conversation';

interface SkeletonLoaderProps {
  variant: SkeletonVariant;
}

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`bg-white/[0.04] animate-pulse ${className}`} />;
}

function DiscoverSkeleton() {
  return (
    <div className="px-3 pt-3">
      {/* Minimal header */}
      <div className="flex items-center justify-between mb-3">
        <SkeletonBlock className="h-6 w-6 rounded-full" />
        <SkeletonBlock className="h-9 w-9 rounded-full" />
      </div>
      {/* Immersive card */}
      <div className="relative w-full rounded-[20px] overflow-hidden" style={{ height: 'calc(100dvh - 160px)' }}>
        <SkeletonBlock className="w-full h-full rounded-[20px]" />
        {/* Photo dots */}
        <div className="absolute top-3 left-4 right-4 flex gap-1">
          <SkeletonBlock className="h-[3px] flex-1 rounded-full" />
          <SkeletonBlock className="h-[3px] flex-1 rounded-full" />
          <SkeletonBlock className="h-[3px] flex-1 rounded-full" />
        </div>
        {/* Bottom info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <SkeletonBlock className="h-8 w-40 rounded-lg mb-2" />
          <SkeletonBlock className="h-5 w-28 rounded-full mb-3" />
          <SkeletonBlock className="h-4 w-full rounded-lg mb-2" />
          <div className="flex gap-2 mb-6">
            <SkeletonBlock className="h-7 w-16 rounded-full" />
            <SkeletonBlock className="h-7 w-20 rounded-full" />
            <SkeletonBlock className="h-7 w-14 rounded-full" />
          </div>
          {/* Action buttons */}
          <div className="flex items-center justify-center gap-5">
            <SkeletonBlock className="w-14 h-14 rounded-full" />
            <SkeletonBlock className="w-11 h-11 rounded-full" />
            <SkeletonBlock className="w-14 h-14 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

function MatchesSkeleton() {
  return (
    <div className="pt-4">
      <SkeletonBlock className="h-7 w-28 rounded-lg mb-5 mx-4" />
      {/* New matches horizontal */}
      <SkeletonBlock className="h-4 w-32 rounded mb-3 mx-4" />
      <div className="flex gap-4 px-4 mb-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <SkeletonBlock className="w-[72px] h-[72px] rounded-full" />
            <SkeletonBlock className="h-3 w-12 rounded" />
          </div>
        ))}
      </div>
      {/* Conversations */}
      <SkeletonBlock className="h-4 w-28 rounded mb-3 mx-4" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 mx-4">
          <SkeletonBlock className="w-[52px] h-[52px] rounded-full shrink-0" />
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
      <div className="flex items-center justify-center gap-3 mb-6">
        <SkeletonBlock className="h-6 w-14 rounded-lg" />
        <SkeletonBlock className="h-6 w-8 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonBlock key={i} className="aspect-[3/4] w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div>
      <SkeletonBlock className="w-full h-[200px] rounded-none" />
      <div className="flex justify-center -mt-[50px] relative z-10 mb-4">
        <SkeletonBlock className="w-[100px] h-[100px] rounded-full" />
      </div>
      <div className="px-5">
        <SkeletonBlock className="h-8 w-48 rounded-lg mx-auto mb-2" />
        <SkeletonBlock className="h-4 w-64 rounded mx-auto mb-6" />
        {/* Interests */}
        <div className="flex flex-wrap gap-2 mb-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-8 w-20 rounded-full" />
          ))}
        </div>
        <SkeletonBlock className="h-32 w-full rounded-2xl mb-4" />
        <SkeletonBlock className="h-12 w-full rounded-full mb-3" />
        <SkeletonBlock className="h-12 w-full rounded-full" />
      </div>
    </div>
  );
}

function ConversationSkeleton() {
  return (
    <div className="flex flex-col h-dvh bg-[#09090B]">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.04]">
        <SkeletonBlock className="w-9 h-9 rounded-full" />
        <SkeletonBlock className="w-10 h-10 rounded-full" />
        <div className="flex-1">
          <SkeletonBlock className="h-4 w-24 rounded mb-1" />
          <SkeletonBlock className="h-3 w-14 rounded" />
        </div>
      </div>
      <div className="flex-1 px-3 py-3 flex flex-col justify-end gap-2">
        <div className="flex justify-end"><SkeletonBlock className="h-10 w-48 rounded-2xl" /></div>
        <div className="flex justify-start"><SkeletonBlock className="h-10 w-40 rounded-2xl" /></div>
        <div className="flex justify-end"><SkeletonBlock className="h-10 w-56 rounded-2xl" /></div>
        <div className="flex justify-start"><SkeletonBlock className="h-10 w-36 rounded-2xl" /></div>
        <div className="flex justify-end"><SkeletonBlock className="h-10 w-44 rounded-2xl" /></div>
      </div>
      <div className="px-3 py-2 border-t border-white/[0.04]">
        <SkeletonBlock className="h-12 w-full rounded-full" />
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
