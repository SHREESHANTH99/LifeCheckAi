import { Droplets } from "lucide-react";
import { SkeletonBase } from "../ui/SkeletonBase";
import { Card } from "../ui/Card";

export function WaterSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="animate-pulse">
          <div className="mb-5 flex items-center gap-3">
            <div className="h-10 w-10 bg-white/10 rounded-2xl" />
            <div className="h-6 w-32 bg-white/10 rounded-full" />
          </div>
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <SkeletonBase className="h-[260px] border-none" />
            <div className="grid gap-3 sm:grid-cols-2">
              <SkeletonBase className="h-24 border-none" />
              <SkeletonBase className="h-24 border-none" />
              <SkeletonBase className="h-24 border-none" />
              <SkeletonBase className="h-24 border-none" />
            </div>
          </div>
        </Card>

        <Card className="animate-pulse">
          <div className="mb-5 flex items-center gap-3">
            <div className="h-10 w-10 bg-white/10 rounded-2xl" />
            <div className="h-6 w-40 bg-white/10 rounded-full" />
          </div>
          <div className="space-y-4">
             <div className="grid gap-3 md:grid-cols-2">
               <SkeletonBase className="h-20 border-none" />
               <SkeletonBase className="h-20 border-none" />
             </div>
             <SkeletonBase className="h-24 border-none" />
             <SkeletonBase className="h-32 border-none" />
          </div>
        </Card>
      </div>
    </div>
  );
}
